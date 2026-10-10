import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function FeatureSection() {
  return (
    <section className="py-12 bg-white overflow-hidden">
      <div className="container mx-auto px-4 lg:px-8 max-w-[1200px]">
        {/* Centered 2x2 Grid, Height Reduced via 16:9 Aspect Ratio */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          
          <Link href="/women" className="group relative aspect-[16/9] md:aspect-[3/2] rounded-[2rem] overflow-hidden shadow-xl block">
            <img 
              src="https://images.unsplash.com/photo-1483985988355-763728e1935b?q=80&w=1000&auto=format&fit=crop" 
              alt="Women's Collection" 
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors duration-500" />
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
              <h3 className="text-[28px] md:text-[36px] font-black text-white tracking-wide drop-shadow-md transform transition-transform duration-500 group-hover:-translate-y-2">Women's</h3>
              <div className="flex items-center gap-2 text-white font-bold text-[14px] opacity-0 group-hover:opacity-100 transition-all duration-500 transform translate-y-4 group-hover:translate-y-0">
                Shop Collection <ArrowRight className="h-4 w-4" />
              </div>
            </div>
          </Link>

          <Link href="/men" className="group relative aspect-[16/9] md:aspect-[3/2] rounded-[2rem] overflow-hidden shadow-xl block">
            <img 
              src="https://images.unsplash.com/photo-1490481651871-ab68de25d43d?q=80&w=1000&auto=format&fit=crop" 
              alt="Men's Collection" 
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors duration-500" />
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
              <h3 className="text-[28px] md:text-[36px] font-black text-white tracking-wide drop-shadow-md transform transition-transform duration-500 group-hover:-translate-y-2">Men's</h3>
              <div className="flex items-center gap-2 text-white font-bold text-[14px] opacity-0 group-hover:opacity-100 transition-all duration-500 transform translate-y-4 group-hover:translate-y-0">
                Shop Collection <ArrowRight className="h-4 w-4" />
              </div>
            </div>
          </Link>

          <Link href="/accessories" className="group relative aspect-[16/9] md:aspect-[3/2] rounded-[2rem] overflow-hidden shadow-xl block">
            <img 
              src="https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=1000&auto=format&fit=crop" 
              alt="Accessories" 
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors duration-500" />
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
              <h3 className="text-[28px] md:text-[36px] font-black text-white tracking-wide drop-shadow-md transform transition-transform duration-500 group-hover:-translate-y-2">Accessories</h3>
              <div className="flex items-center gap-2 text-white font-bold text-[14px] opacity-0 group-hover:opacity-100 transition-all duration-500 transform translate-y-4 group-hover:translate-y-0">
                Explore Styles <ArrowRight className="h-4 w-4" />
              </div>
            </div>
          </Link>

          <Link href="/sale" className="group relative aspect-[16/9] md:aspect-[3/2] rounded-[2rem] overflow-hidden shadow-xl block">
            <img 
              src="https://images.unsplash.com/photo-1445205170230-053b83016050?q=80&w=1000&auto=format&fit=crop" 
              alt="Sale" 
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors duration-500" />
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
              <span className="text-red-400 font-bold text-[12px] tracking-widest uppercase mb-1 drop-shadow-md transform transition-transform duration-500 group-hover:-translate-y-2">Up to 50% Off</span>
              <h3 className="text-[28px] md:text-[36px] font-black text-white tracking-wide drop-shadow-md transform transition-transform duration-500 group-hover:-translate-y-2">Clearance</h3>
              <div className="flex items-center gap-2 text-white font-bold text-[14px] opacity-0 group-hover:opacity-100 transition-all duration-500 transform translate-y-4 group-hover:translate-y-0">
                Shop Sale <ArrowRight className="h-4 w-4" />
              </div>
            </div>
          </Link>

        </div>
      </div>
    </section>
  );
}
