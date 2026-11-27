import { MotionScript } from "./motion/motion-script";
import { SiteHeader } from "./site-header";
import { SiteFooter } from "./site-footer";
import { Hero } from "./sections/hero";
import { FlowRail } from "./sections/flow-rail";
import { Features } from "./sections/features";
import { Kitchen } from "./sections/kitchen";
import { Customer } from "./sections/customer";
import { Steps } from "./sections/steps";
import { Faq } from "./sections/faq";
import { FinalCta } from "./sections/final-cta";
import styles from "./landing.module.css";

export interface LandingPageProps {
  loginHref: string;
  signupHref: string;
  exampleHref: string;
}

/** Sales page for restaurants (spec: docs/superpowers/specs/2026-11-27-landing-premium-design.md). */
export function LandingPage({ loginHref, signupHref, exampleHref }: LandingPageProps) {
  return (
    <div className={styles.page}>
      <MotionScript />
      <SiteHeader loginHref={loginHref} signupHref={signupHref} />
      <main>
        <Hero signupHref={signupHref} exampleHref={exampleHref} />
        <FlowRail />
        <Features />
        <Kitchen />
        <Customer />
        <Steps signupHref={signupHref} />
        <Faq />
        <FinalCta signupHref={signupHref} exampleHref={exampleHref} />
      </main>
      <SiteFooter loginHref={loginHref} />
    </div>
  );
}
