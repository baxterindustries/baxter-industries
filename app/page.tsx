import QuoteForm from "./components/QuoteForm";
import Reveal from "./components/Reveal";
import Stars from "./components/Stars";
import {
  WrenchIcon,
  SparkleIcon,
  HammerIcon,
  HomeIcon,
} from "./components/Icons";

const services = [
  {
    name: "Maintenance",
    desc: "Repairs, fixes, and upkeep that keep your property running smoothly year-round.",
    cardClass: "card-blue",
    icon: <WrenchIcon color="#185fa5" />,
  },
  {
    name: "Cleaning",
    desc: "Move-outs, deep cleans, and turnovers left spotless and move-in ready.",
    cardClass: "card-green",
    icon: <SparkleIcon color="#0c4d3a" />,
  },
  {
    name: "Carpentry & framing",
    desc: "Custom builds, repairs, and solid framing from skilled hands.",
    cardClass: "card-cream",
    icon: <HammerIcon color="#3a3320" />,
  },
  {
    name: "Unit renovations",
    desc: "Full turn-key renovations that get rentals tenant-ready, fast.",
    cardClass: "card-blue",
    icon: <HomeIcon color="#185fa5" />,
  },
];

const reviews = [
  {
    rating: 5.0,
    quote: "Our kitchen looks incredible. On time, on budget, super clean crew.",
    author: "Sarah M.",
  },
  {
    rating: 5.0,
    quote: "Fast, professional, and honest pricing. Highly recommend Baxter.",
    author: "Mike T.",
  },
  {
    rating: 5.0,
    quote: "Great work on our rental units. Quick turnaround between tenants.",
    author: "Dave R.",
  },
];

export default function Home() {
  return (
    <>
      {/* 1. Header */}
      <header className="header">
        <div className="container header-inner">
          <span className="brand">Baxter Industries</span>
          <a href="#quote" className="btn btn-orange btn-sm">
            Free quote
          </a>
        </div>
      </header>

      <main>
        {/* 2. Hero */}
        <Reveal>
          <section className="hero">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/hero.jpg"
              alt="Baxter Industries remodeling project"
              className="hero-bg"
            />
            <div className="container">
              <h1>Maintenance &amp; remodeling, done right</h1>
              <p>Serving New England homes &amp; businesses</p>
              <a href="#quote" className="btn btn-orange">
                Request your free quote
              </a>
            </div>
          </section>
        </Reveal>

        {/* 3. Services */}
        <Reveal>
          <section className="section section-white">
            <div className="container">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/crew.jpg"
                alt="The Baxter Industries crew at work"
                className="photo banner"
              />
              <h2 className="section-title">Our services</h2>
              <div className="services-grid">
                {services.map((s) => (
                  <div key={s.name} className={`service-card ${s.cardClass}`}>
                    <span className="icon">{s.icon}</span>
                    <div>
                      <h3>{s.name}</h3>
                      <p>{s.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </Reveal>

        {/* 4. Kitchen remodels */}
        <Reveal>
          <section className="section section-cream">
            <div className="container">
              <h2 className="section-title">Kitchen remodels</h2>
              <p className="section-subtitle">See the transformation</p>
              <div className="ba-grid">
                <div className="ba-item">
                  <div className="ba-label">Before</div>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/kitchen-before.png"
                    alt="Kitchen before remodel"
                    className="photo photo-ba"
                  />
                </div>
                <div className="ba-item">
                  <div className="ba-label">After</div>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/kitchen-after.png"
                    alt="Kitchen after remodel"
                    className="photo photo-ba"
                  />
                </div>
              </div>
            </div>
          </section>
        </Reveal>

        {/* 5. Bathroom remodels */}
        <Reveal>
          <section className="section section-white">
            <div className="container">
              <h2 className="section-title">Bathroom remodels</h2>
              <p className="section-subtitle">See the transformation</p>
              <div className="ba-grid">
                <div className="ba-item">
                  <div className="ba-label">Before</div>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/bathroom-before.png"
                    alt="Bathroom before remodel"
                    className="photo photo-ba"
                  />
                </div>
                <div className="ba-item">
                  <div className="ba-label">After</div>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/bathroom-after.png"
                    alt="Bathroom after remodel"
                    className="photo photo-ba"
                  />
                </div>
              </div>
            </div>
          </section>
        </Reveal>

        {/* 6. Reviews */}
        <Reveal>
          <section className="section section-light-blue">
            <div className="container">
              <h2 className="section-title">What our customers say</h2>
              <div className="reviews-grid">
                {reviews.map((r) => (
                  <div key={r.author} className="review-card">
                    <Stars rating={r.rating} />
                    <p className="review-quote">&ldquo;{r.quote}&rdquo;</p>
                    <span className="review-author">— {r.author}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </Reveal>

        {/* 7. Quote form */}
        <Reveal>
          <section id="quote" className="section section-blue">
            <div className="container quote-wrap">
              <h2 className="section-title">Request a free quote</h2>
              <p className="section-subtitle">
                Tell us what you need — we&apos;ll get right back to you
              </p>
              <QuoteForm />
            </div>
          </section>
        </Reveal>
      </main>

      {/* 8. Footer */}
      <footer className="footer">
        <div className="container">
          Baxter Industries · New Hampshire · (603) 929-6684
        </div>
      </footer>
    </>
  );
}
