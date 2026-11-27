"use client";

import { Check, Plus, ShoppingBag } from "lucide-react";
import { useState, type CSSProperties } from "react";
import { cn } from "@/lib/cn";
import { readableBrand } from "@/lib/restaurant-theme";
import { BRAND_SWATCHES } from "@/lib/schemas/settings";
import { DEMO_DISHES, DEMO_RESTAURANT, formatPrice } from "../copy";
import base from "./demos.module.css";
import styles from "./menu-color-demo.module.css";

/** The one demo you can touch: pick a colour and the menu follows it, like the real setting. */
export function MenuColorDemo() {
  const [color, setColor] = useState<string>(BRAND_SWATCHES[0].value);
  const style = { "--demo-accent": color, "--demo-fill": readableBrand(color) } as CSSProperties;

  return (
    <div data-demo="menu-color" className={cn(base.stage, styles.stage)} style={style}>
      <div aria-hidden="true" className={styles.card}>
        <div className={styles.cover}>
          <span className={styles.logo}>{DEMO_RESTAURANT.slice(0, 1)}</span>
        </div>
        <div className={styles.body}>
          <strong className={styles.name}>{DEMO_RESTAURANT}</strong>
          <div className={styles.tabs}><span data-active="true">Massas</span><span>Sobremesas</span><span>Bebidas</span></div>
          {DEMO_DISHES.slice(0, 2).map((dish) => (
            <div key={dish.name} className={styles.row}>
              <span className={cn(base.dish, styles.thumb)} data-tone={dish.tone} />
              <span className={styles.rowText}><strong>{dish.name}</strong><span className={base.mono}>{formatPrice(dish.priceCents)}</span></span>
              <span className={styles.add}><Plus size={14} strokeWidth={2.6} /></span>
            </div>
          ))}
          <span className={styles.bag}><ShoppingBag size={15} />Ver sacola</span>
        </div>
      </div>

      <div role="group" aria-label="Experimente uma cor" className={styles.swatches}>
        {BRAND_SWATCHES.map((swatch) => (
          <button
            key={swatch.value}
            type="button"
            aria-label={swatch.label}
            aria-pressed={color === swatch.value}
            title={swatch.label}
            onClick={() => setColor(swatch.value)}
            className={styles.swatch}
            style={{ backgroundColor: swatch.value }}
          >
            {color === swatch.value && <Check size={14} strokeWidth={3} aria-hidden="true" />}
          </button>
        ))}
      </div>
    </div>
  );
}
