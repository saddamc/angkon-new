import test, { describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  buildCategoryFolderPath,
  buildCloudinaryFolderPath,
  cloudinary,
  deleteCloudinaryFolderIfEmpty,
  deleteFromCloudinary,
  moveAssetToFolder,
  normalizeToSingleCloudinaryRoot,
  uploadToCloudinary,
} from "../src/lib/cloudinary";
import { ENVIRONMENT_DATABASE_MAP, getAppEnvironment } from "../src/server/env/app-environment";
import { buildCategoryTree, findCategoryPathBySlugs } from "../src/lib/woocommerce/categories";
import imageLoader from "../src/lib/image-loader";
import type { WooCategory } from "../src/types/product";

describe("Final Single Cloudinary Root Architecture (ANGKON/)", () => {
  test("1. normalizeToSingleCloudinaryRoot enforces ANGKON/ and rejects ANGKON_DEV/PREVIEW/TEST", () => {
    assert.equal(normalizeToSingleCloudinaryRoot("ANGKON_DEV/CATEGORIES/WOMEN"), "ANGKON/CATEGORIES/WOMEN");
    assert.equal(normalizeToSingleCloudinaryRoot("ANGKON_PREVIEW/PRODUCTS/test"), "ANGKON/PRODUCTS/test");
    assert.equal(normalizeToSingleCloudinaryRoot("ANGKON_TEST/Banners"), "ANGKON/Banners");
    assert.equal(normalizeToSingleCloudinaryRoot("ANGKON_DEV"), "ANGKON");
    assert.equal(normalizeToSingleCloudinaryRoot("Categories/category-914"), "ANGKON/Categories/category-914");
    assert.equal(normalizeToSingleCloudinaryRoot("ANGKON/Products/product-228001"), "ANGKON/Products/product-228001");
  });

  test("2. buildCategoryFolderPath and buildCloudinaryFolderPath never generate ANGKON_DEV", () => {
    const catPathById = buildCategoryFolderPath({ categoryId: 914 });
    assert.equal(catPathById, "ANGKON/Categories/category-914");
    assert.ok(!catPathById.includes("ANGKON_DEV"));

    const catPathBySlug = buildCategoryFolderPath({ category: "ethnic-wear" });
    assert.equal(catPathBySlug, "ANGKON/CATEGORIES/ETHNIC_WEAR");
    assert.ok(!catPathBySlug.includes("ANGKON_DEV"));

    const prodPath = buildCloudinaryFolderPath({ category: "women", subcategory: "ethnic-wear", product: "tawakkal-wada" });
    assert.ok(prodPath.startsWith("ANGKON/"));
    assert.ok(!prodPath.includes("ANGKON_DEV"));
  });

  test("3. uploadToCloudinary in test/non-prod uses only ANGKON/ root and never ANGKON_DEV/", async () => {
    const prevNodeEnv = process.env.NODE_ENV;
    (process.env as Record<string, string | undefined>).NODE_ENV = "test";
    try {
      const res = await uploadToCloudinary(Buffer.from("fake-image"), {
        folder: "ANGKON/Products/product-100",
      });
      assert.ok(res.public_id.startsWith("ANGKON/"), `Expected ANGKON/ prefix, got ${res.public_id}`);
      assert.ok(!res.public_id.includes("ANGKON_DEV"), "Must never generate ANGKON_DEV prefix");

      const normalizedRes = await uploadToCloudinary(Buffer.from("fake-image"), {
        folder: "ANGKON_DEV/Categories/category-914",
      });
      assert.ok(normalizedRes.public_id.startsWith("ANGKON/Categories/category-914"));
      assert.ok(!normalizedRes.public_id.includes("ANGKON_DEV"));
    } finally {
      (process.env as Record<string, string | undefined>).NODE_ENV = prevNodeEnv;
    }
  });

  test("4. Category move/reorder routes preserve image URLs while syncing Cloudinary asset_folder", () => {
    const filesToCheck = [
      "src/app/api/admin/categories/relocate/route.ts",
      "src/app/api/admin/categories/reorder/route.ts",
      "src/app/api/admin/categories/move-products/route.ts",
      "src/app/api/admin/products/[id]/route.ts",
      "src/server/products/services/product.service.ts",
    ];

    for (const relPath of filesToCheck) {
      const content = fs.readFileSync(path.resolve(process.cwd(), relPath), "utf8");
      assert.ok(
        !content.includes("syncProductImageFoldersForCategories"),
        `${relPath} must not call syncProductImageFoldersForCategories`
      );
      assert.ok(
        !content.includes("syncProductImagesToCategoryFolder"),
        `${relPath} must not call syncProductImagesToCategoryFolder`
      );
    }

    const relocateSrc = fs.readFileSync(
      path.resolve(process.cwd(), "src/app/api/admin/categories/relocate/route.ts"),
      "utf8"
    );
    const reorderSrc = fs.readFileSync(
      path.resolve(process.cwd(), "src/app/api/admin/categories/reorder/route.ts"),
      "utf8"
    );
    const moveProductsSrc = fs.readFileSync(
      path.resolve(process.cwd(), "src/app/api/admin/categories/move-products/route.ts"),
      "utf8"
    );
    assert.ok(
      relocateSrc.includes("syncCloudinaryAssetFoldersForCategories"),
      "relocate route must sync asset_folder via syncCloudinaryAssetFoldersForCategories"
    );
    assert.ok(
      reorderSrc.includes("syncCloudinaryAssetFoldersForCategories"),
      "reorder route must sync asset_folder when category parent changes"
    );
    assert.ok(
      moveProductsSrc.includes("syncSingleProductAssetFolders"),
      "move-products route must sync asset_folder for moved products"
    );
  });

  test("5. Category hierarchy service never bulk-deletes category folders", () => {
    const content = fs.readFileSync(
      path.resolve(process.cwd(), "src/server/categories/services/category.service.ts"),
      "utf8"
    );
    assert.ok(
      !content.includes("deleteCloudinaryFolder("),
      "category.service.ts must never bulk-delete a category folder"
    );
  });

  test("6. Category image replacement defers old asset deletion until after DB update succeeds", () => {
    const content = fs.readFileSync(
      path.resolve(process.cwd(), "src/app/api/admin/categories/[id]/route.ts"),
      "utf8"
    );
    const updateIdx = content.indexOf("Category.findOneAndUpdate");
    const deleteIdx = content.indexOf("deleteFromCloudinary(oldCategory.image.src)");
    assert.ok(updateIdx > 0, "Category.findOneAndUpdate must exist");
    assert.ok(deleteIdx > updateIdx, "deleteFromCloudinary must happen AFTER Category.findOneAndUpdate succeeds");
    assert.ok(
      content.includes("input.image !== undefined"),
      "Partial category updates without image must not delete existing category image"
    );
  });

  test("7. Local and Production MongoDB database separation remains intact", () => {
    assert.equal(ENVIRONMENT_DATABASE_MAP.development, "angkon_dev");
    assert.equal(ENVIRONMENT_DATABASE_MAP.production, "angkon");
    assert.ok(getAppEnvironment() !== "production" || process.env.NODE_ENV === "production");
  });

  test("8. Ethnic Wear (parent=0, linked_parents=[163]) appears in main categories AND under Women", () => {
    const sample = JSON.parse(
      fs.readFileSync(path.resolve(process.cwd(), "src/data/real-categories.json"), "utf8")
    ) as WooCategory[];
    const tree = buildCategoryTree(sample);

    const rootSlugs = tree.map((c) => c.slug);
    assert.ok(rootSlugs.includes("ethnic-wear"), "Ethnic Wear must remain in root main categories");
    assert.ok(rootSlugs.includes("women"), "Women must be in root main categories");

    const women = tree.find((c) => c.slug === "women");
    assert.ok(women, "Women category must exist");
    const linkedEthnic = women.children.find((c) => c.slug === "ethnic-wear");
    assert.ok(linkedEthnic, "Ethnic Wear must also appear under Women via linked_parents");
    assert.equal(linkedEthnic.is_linked, true);

    assert.ok(findCategoryPathBySlugs(tree, ["ethnic-wear"]), "/ethnic-wear root path must resolve");
    assert.ok(findCategoryPathBySlugs(tree, ["women", "ethnic-wear"]), "/women/ethnic-wear path must resolve");
  });

  test("9. Automatic category-based Cloudinary image relocation (uploader.rename) is disabled across src/", () => {
    const srcRoot = path.resolve(process.cwd(), "src");
    const stack = [srcRoot];
    const renameFiles: string[] = [];

    while (stack.length > 0) {
      const dir = stack.pop()!;
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          stack.push(full);
        } else if (/\.(ts|tsx|js|mjs)$/.test(entry.name)) {
          const text = fs.readFileSync(full, "utf8");
          if (text.includes("uploader.rename")) {
            renameFiles.push(path.relative(process.cwd(), full));
          }
        }
      }
    }

    assert.deepEqual(renameFiles, [], "No file in src/ may call cloudinary.uploader.rename");
  });

  test("10. CategoryStudio deferred upload/cleanup never mutates Cloudinary before saving, and upload DELETE protects Category refs", () => {
    const studioSrc = fs.readFileSync(
      path.resolve(process.cwd(), "src/app/admin/categories/CategoryStudio.tsx"),
      "utf8"
    );
    const managerSrc = fs.readFileSync(
      path.resolve(process.cwd(), "src/app/admin/categories/_hooks/use-categories-manager.ts"),
      "utf8"
    );
    assert.ok(
      studioSrc.includes("if (wasInSession && (toDeleteId || toDeleteUrl))"),
      "CategoryStudio remove must only delete unsaved session uploads immediately"
    );
    assert.ok(
      studioSrc.includes('set("stagedFile", prepared)') && managerSrc.includes("if (data.stagedFile)"),
      "CategoryStudio must stage new category images locally and upload only on Save"
    );

    const uploadRouteSrc = fs.readFileSync(
      path.resolve(process.cwd(), "src/app/api/admin/upload/route.ts"),
      "utf8"
    );
    assert.ok(
      uploadRouteSrc.includes("isUsedByCategory"),
      "/api/admin/upload DELETE must protect images referenced by Categories"
    );
  });

  test("11. Static JSON catalogs have no ANGKON_DEV URLs and keep Aiman Aisha under Ethnic Wear", () => {
    const rawCats = fs.readFileSync(path.resolve(process.cwd(), "src/data/real-categories.json"), "utf8");
    const rawProds = fs.readFileSync(path.resolve(process.cwd(), "src/data/real-products.json"), "utf8");
    assert.ok(!/ANGKON_(?:DEV|PREVIEW|TEST)/i.test(rawCats), "real-categories.json must not contain ANGKON_DEV");
    assert.ok(!/ANGKON_(?:DEV|PREVIEW|TEST)/i.test(rawProds), "real-products.json must not contain ANGKON_DEV");

    const cats = JSON.parse(rawCats) as WooCategory[];
    const aiman = cats.find((c) => c.id === 992);
    assert.ok(aiman, "Aiman Aisha category (992) must exist");
    assert.equal(aiman.parent, 914, "Aiman Aisha must have parent 914 (Ethnic Wear)");
  });

  test("12. ProductForm and CreateCategoryModal stage selected files locally and upload ONLY on Save/Update", () => {
    const productFormSrc = fs.readFileSync(
      path.resolve(process.cwd(), "src/components/admin/product-form/ProductForm.tsx"),
      "utf8"
    );
    const pickSectionStart = productFormSrc.indexOf("const handleImageUpload =");
    const pickSectionEnd = productFormSrc.indexOf("const removeImage =", pickSectionStart);
    assert.ok(pickSectionStart > 0 && pickSectionEnd > pickSectionStart);
    const pickFn = productFormSrc.slice(pickSectionStart, pickSectionEnd);
    assert.ok(pickFn.includes("URL.createObjectURL(file)"), "handleImageUpload must create local blob preview");
    assert.ok(!pickFn.includes("uploadImageWithProgress"), "handleImageUpload must NOT upload to Cloudinary before Save/Update");

    const submitIdx = productFormSrc.indexOf("const handleSubmit =");
    const uploadInSubmitIdx = productFormSrc.indexOf("uploadImageWithProgress(", submitIdx);
    assert.ok(uploadInSubmitIdx > submitIdx, "Cloudinary upload must execute inside handleSubmit on Save/Update");

    const modalSrc = fs.readFileSync(
      path.resolve(process.cwd(), "src/app/admin/categories/CreateCategoryModal.tsx"),
      "utf8"
    );
    const modalUploadStart = modalSrc.indexOf("const uploadFile =");
    const modalUploadEnd = modalSrc.indexOf("const handleImageUpload =", modalUploadStart);
    assert.ok(modalUploadStart > 0 && modalUploadEnd > modalUploadStart);
    const modalPickFn = modalSrc.slice(modalUploadStart, modalUploadEnd);
    assert.ok(modalPickFn.includes("setStagedFile(prepared)"), "CreateCategoryModal uploadFile must stage WebP file locally");
    assert.ok(!modalPickFn.includes("/api/admin/upload"), "CreateCategoryModal uploadFile must NOT upload before Create Category");
  });

  test("13. imageLoader preserves local blob: and data: preview URLs unmodified", () => {
    const blobUrl = "blob:http://localhost:3001/1234-5678";
    const dataUrl = "data:image/webp;base64,UklGRh4AAABXRUJQ";
    assert.equal(imageLoader({ src: blobUrl, width: 600 }), blobUrl);
    assert.equal(imageLoader({ src: dataUrl, width: 600 }), dataUrl);
  });

  test("14. moveAssetToFolder moves asset_folder without changing public_id or URL and handles 404/noop", async () => {
    const updates: Array<{ publicId: string; asset_folder: string }> = [];
    const createdFolders: string[] = [];

    const mockApi = {
      async resource(publicId: string) {
        if (publicId.includes("missing")) {
          const err = new Error("Not found") as Error & { http_code: number };
          err.http_code = 404;
          throw err;
        }
        if (publicId.includes("already-there")) {
          return {
            public_id: publicId,
            asset_folder: "ANGKON/ETHNIC_WEAR/TEST/test-my-file",
          };
        }
        return {
          public_id: publicId,
          asset_folder: "ANGKON/ACCESSORIES/TEST/test-my-file",
        };
      },
      async create_folder(folderPath: string) {
        createdFolders.push(folderPath);
        return { success: true };
      },
      async update(publicId: string, opts: { asset_folder?: string }) {
        updates.push({ publicId, asset_folder: opts.asset_folder || "" });
        return { public_id: publicId, asset_folder: opts.asset_folder };
      },
    } as unknown as typeof cloudinary.api;

    const movedRes = await moveAssetToFolder(
      "https://res.cloudinary.com/drtzgyetn/image/upload/v1795554677/ANGKON/ACCESSORIES/TEST/test-my-file/file_awee4j.webp",
      "ANGKON/ETHNIC_WEAR/TEST/test-my-file",
      { api: mockApi }
    );
    assert.equal(movedRes.moved, true);
    assert.equal(movedRes.publicId, "ANGKON/ACCESSORIES/TEST/test-my-file/file_awee4j");
    assert.equal(movedRes.previousFolder, "ANGKON/ACCESSORIES/TEST/test-my-file");
    assert.equal(movedRes.targetFolder, "ANGKON/ETHNIC_WEAR/TEST/test-my-file");
    assert.deepEqual(createdFolders, ["ANGKON/ETHNIC_WEAR/TEST/test-my-file"]);
    assert.deepEqual(updates, [
      {
        publicId: "ANGKON/ACCESSORIES/TEST/test-my-file/file_awee4j",
        asset_folder: "ANGKON/ETHNIC_WEAR/TEST/test-my-file",
      },
    ]);

    const missingRes = await moveAssetToFolder(
      "https://res.cloudinary.com/drtzgyetn/image/upload/v1/ANGKON/ACCESSORIES/TEST/missing/file_1.webp",
      "ANGKON/ETHNIC_WEAR/TEST/missing",
      { api: mockApi }
    );
    assert.equal(missingRes.moved, false);
    assert.equal(missingRes.skippedReason, "not-found");

    const noopRes = await moveAssetToFolder(
      "https://res.cloudinary.com/drtzgyetn/image/upload/v1/ANGKON/ETHNIC_WEAR/TEST/already-there/file_2.webp",
      "ANGKON/ETHNIC_WEAR/TEST/test-my-file",
      { api: mockApi }
    );
    assert.equal(noopRes.moved, false);
    assert.equal(noopRes.skippedReason, "already-in-target");
  });

  test("15. deleteCloudinaryFolderIfEmpty protects core roots, refuses non-empty folders, and walks up safely", async () => {
    const deleted: string[] = [];
    const remainingSubfolders = new Map<string, string[]>([
      ["ANGKON/ACCESSORIES/TEST/test-my-file", []],
      ["ANGKON/ACCESSORIES/TEST", ["test-my-file"]],
      ["ANGKON/ACCESSORIES", ["TEST", "watches"]],
      ["ANGKON/ETHNIC_WEAR/GUZEL/busy-folder", []],
    ]);

    const mockApi = {
      async resources_by_asset_folder(folderPath: string) {
        if (folderPath === "ANGKON/ETHNIC_WEAR/GUZEL/busy-folder") {
          return { resources: [{ public_id: "ANGKON/ETHNIC_WEAR/GUZEL/busy-folder/img" }] };
        }
        return { resources: [] };
      },
      async sub_folders(folderPath: string) {
        return {
          folders: (remainingSubfolders.get(folderPath) || []).map((name) => ({ name })),
        };
      },
      async delete_folder(folderPath: string) {
        deleted.push(folderPath);
        if (folderPath === "ANGKON/ACCESSORIES/TEST/test-my-file") {
          remainingSubfolders.set("ANGKON/ACCESSORIES/TEST", []);
        } else if (folderPath === "ANGKON/ACCESSORIES/TEST") {
          remainingSubfolders.set("ANGKON/ACCESSORIES", ["watches"]);
        }
        return { deleted: [folderPath] };
      },
    } as unknown as typeof cloudinary.api;

    // Refuses protected roots even when empty
    for (const protectedPath of [
      "ANGKON",
      "ANGKON/CATEGORIES",
      "ANGKON/ETHNIC_WEAR",
      "ANGKON/ACCESSORIES",
      "ANGKON/TEST",
    ]) {
      const res = await deleteCloudinaryFolderIfEmpty(protectedPath, { api: mockApi });
      assert.equal(res.deletedFolders.length, 0);
      assert.equal(res.skippedReason, "protected-path");
    }

    // Refuses non-empty folder containing an image
    const busyRes = await deleteCloudinaryFolderIfEmpty(
      "ANGKON/ETHNIC_WEAR/GUZEL/busy-folder",
      { api: mockApi }
    );
    assert.equal(busyRes.deletedFolders.length, 0);
    assert.equal(busyRes.skippedReason, "folder-has-resources");

    // Cleans empty product folder + empty parent subcategory TEST, stops before ANGKON/ACCESSORIES
    const cascadeRes = await deleteCloudinaryFolderIfEmpty(
      "ANGKON/ACCESSORIES/TEST/test-my-file",
      { api: mockApi }
    );
    assert.deepEqual(cascadeRes.deletedFolders, [
      "ANGKON/ACCESSORIES/TEST/test-my-file",
      "ANGKON/ACCESSORIES/TEST",
    ]);
    assert.deepEqual(deleted, [
      "ANGKON/ACCESSORIES/TEST/test-my-file",
      "ANGKON/ACCESSORIES/TEST",
    ]);
  });

  test("16. Category delete supports shift & delete_products with Dynamic Folder cleanup", () => {
    const categoryServiceSrc = fs.readFileSync(
      path.resolve(process.cwd(), "src/server/categories/services/category.service.ts"),
      "utf8"
    );
    assert.ok(
      categoryServiceSrc.includes('opts.mode === "shift"'),
      "deleteAdminCategoryHierarchy must support shifting products to a target category"
    );
    assert.ok(
      categoryServiceSrc.includes("syncSingleProductAssetFolders"),
      "shift mode must relocate shifted product folders via asset_folder"
    );
    assert.ok(
      categoryServiceSrc.includes("getCloudinaryAssetFolder") &&
        categoryServiceSrc.includes("deleteCloudinaryFolderIfEmpty"),
      "deleteAdminCategoryHierarchy must resolve live asset_folder and clean empty folders safely"
    );
    assert.ok(
      categoryServiceSrc.includes("forceConfirmed: opts.deleteCloudinary"),
      "deleteAdminCategoryHierarchy must pass explicit confirmation flag to deleteFromCloudinary"
    );
  });

  test("17. AdminToast is centered and DeleteConfirmModal offers shift vs permanent delete", () => {
    const toastSrc = fs.readFileSync(
      path.resolve(process.cwd(), "src/components/admin/AdminToast.tsx"),
      "utf8"
    );
    assert.ok(
      toastSrc.includes("left-1/2 -translate-x-1/2"),
      "AdminToast must be centered horizontally in the middle"
    );
    assert.ok(
      toastSrc.includes("AdminProcessingOverlay"),
      "AdminToast module must export AdminProcessingOverlay"
    );

    const deleteModalSrc = fs.readFileSync(
      path.resolve(process.cwd(), "src/app/admin/categories/DeleteConfirmModal.tsx"),
      "utf8"
    );
    assert.ok(
      deleteModalSrc.includes('mode === "shift"') &&
        deleteModalSrc.includes('mode === "delete_products"') &&
        deleteModalSrc.includes("ParentCategoryPicker"),
      "DeleteConfirmModal must support shifting products or confirming permanent deletion"
    );
  });

  test("18. deleteFromCloudinary stays mocked in test environment even with forceConfirmed", async () => {
    const prevNodeEnv = process.env.NODE_ENV;
    (process.env as Record<string, string | undefined>).NODE_ENV = "test";
    try {
      const res = await deleteFromCloudinary(
        "https://res.cloudinary.com/drtzgyetn/image/upload/v1/ANGKON/ACCESSORIES/TEST/file_1.webp",
        { forceConfirmed: true }
      );
      assert.equal(res.result, "ok");
    } finally {
      (process.env as Record<string, string | undefined>).NODE_ENV = prevNodeEnv;
    }
  });
});
