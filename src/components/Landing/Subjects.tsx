import { memo } from "react";
import subjectIcons from "@/assets/landing/subject_icons_set.png";
import scienceDna from "@/assets/landing/science_visualization_dna.png";

const Subjects = memo(() => (
  <section className="py-16 bg-background relative overflow-hidden">
    {/* Decorative DNA image */}
    <img
      src={scienceDna}
      alt=""
      aria-hidden="true"
      className="absolute -right-20 top-0 w-64 h-64 object-contain opacity-10 pointer-events-none hidden lg:block"
      loading="lazy"
    />

    <div className="container mx-auto px-4">
      <div className="text-center mb-8">
        <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-3">
          Streams We Offer
        </h2>
        <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
          Comprehensive coaching across all major academic streams
        </p>
      </div>

      <div className="max-w-4xl mx-auto rounded-2xl overflow-hidden shadow-lg border border-border">
        <img
          src={subjectIcons}
          alt="Subject streams – Maths, Science, Commerce, Arts and more"
          className="w-full h-auto object-cover"
          loading="lazy"
          decoding="async"
        />
      </div>
    </div>
  </section>
));

Subjects.displayName = "Subjects";
export default Subjects;
