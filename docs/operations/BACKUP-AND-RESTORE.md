# Backup & Restore Procedures — ANGKON

## 1. Automated MongoDB Atlas Backups
ANGKON relies on **MongoDB Atlas Cloud Backups**:
* **Continuous Cloud Backups:** Enabled on M10+ clusters with point-in-time recovery (PITR) down to the exact second for the last 7 days.
* **Daily Snapshots:** Retained for 30 days.
* **Monthly Snapshots:** Retained for 12 months for financial compliance.

---

## 2. On-Demand Manual Database Dump

Before running large-scale data migrations or major updates, take a manual backup:

```powershell
# Create timestamped dump directory
$ts = Get-Date -Format "yyyyMMdd-HHmmss"
mongodump --uri="<MONGODB_URI>" --out="./backups/angkon-backup-$ts"
```

To compress the dump:
```powershell
Compress-Archive -Path "./backups/angkon-backup-$ts" -DestinationPath "./backups/angkon-backup-$ts.zip"
```

---

## 3. Database Restore Drill

To restore a snapshot into an isolated test or staging cluster:

```powershell
mongorestore --uri="<STAGING_MONGODB_URI>" --drop "./backups/angkon-backup-<TIMESTAMP>/angkon"
```

> [!CAUTION]
> Never run `mongorestore --drop` against the production cluster without explicit incident lead authorization.
