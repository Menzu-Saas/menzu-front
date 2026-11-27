import { act, render, renderHook, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useInView } from "@/components/landing/motion/use-in-view";
import { useDemoSequence } from "@/components/landing/motion/use-demo-sequence";
import { Reveal } from "@/components/landing/motion/reveal";

type Callback = (entries: { isIntersecting: boolean }[]) => void;
let observers: { callback: Callback; observe: ReturnType<typeof vi.fn>; disconnect: ReturnType<typeof vi.fn> }[] = [];

function installObserver() {
  observers = [];
  vi.stubGlobal("IntersectionObserver", class {
    observe = vi.fn();
    disconnect = vi.fn();
    unobserve = vi.fn();
    constructor(callback: Callback) { observers.push({ callback, observe: this.observe, disconnect: this.disconnect }); }
  });
}
function installMotion(reduced: boolean) {
  vi.stubGlobal("matchMedia", (query: string) => ({ matches: reduced && query.includes("reduce"), media: query, addEventListener() {}, removeEventListener() {} }));
}
function setVisibility(state: "visible" | "hidden") {
  Object.defineProperty(document, "visibilityState", { configurable: true, get: () => state });
}

beforeEach(() => setVisibility("visible"));
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

describe("useInView", () => {
  it("sem IntersectionObserver considera visível na hora", () => {
    vi.stubGlobal("IntersectionObserver", undefined);
    const { result } = renderHook(() => useInView<HTMLDivElement>());
    expect(result.current[1]).toBe(true);
  });

  it("fica visível uma vez quando entra na tela e para de observar", () => {
    installObserver();
    function Probe() {
      const [ref, inView] = useInView<HTMLDivElement>();
      return <div ref={ref} data-testid="probe" data-in-view={inView} />;
    }
    render(<Probe />);
    expect(screen.getByTestId("probe").dataset.inView).toBe("false");
    act(() => observers[0]!.callback([{ isIntersecting: true }]));
    expect(screen.getByTestId("probe").dataset.inView).toBe("true");
    expect(observers[0]!.disconnect).toHaveBeenCalled();
  });
});

describe("useDemoSequence", () => {
  it("avança um passo por intervalo e para no último", () => {
    installObserver();
    installMotion(false);
    vi.useFakeTimers();
    const { result } = renderHook(() => useDemoSequence(4, true, 900));
    expect(result.current).toBe(0);
    act(() => vi.advanceTimersByTime(900));
    expect(result.current).toBe(1);
    act(() => vi.advanceTimersByTime(5000));
    expect(result.current).toBe(3);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("inativa (fora da tela) não deixa nenhum timer rodando", () => {
    installObserver();
    installMotion(false);
    vi.useFakeTimers();
    const { result } = renderHook(() => useDemoSequence(4, false, 900));
    expect(result.current).toBe(0);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("com a aba oculta não avança e retoma quando volta", () => {
    installObserver();
    installMotion(false);
    vi.useFakeTimers();
    setVisibility("hidden");
    const { result } = renderHook(() => useDemoSequence(4, true, 900));
    act(() => vi.advanceTimersByTime(5000));
    expect(result.current).toBe(0);
    setVisibility("visible");
    act(() => { document.dispatchEvent(new Event("visibilitychange")); });
    act(() => vi.advanceTimersByTime(900));
    expect(result.current).toBe(1);
  });

  it("com movimento reduzido mostra o estado final desde o início", () => {
    installObserver();
    installMotion(true);
    const { result } = renderHook(() => useDemoSequence(4, true, 900));
    expect(result.current).toBe(3);
  });

  it("sem IntersectionObserver (navegador antigo) mostra o estado final", () => {
    vi.stubGlobal("IntersectionObserver", undefined);
    installMotion(false);
    const { result } = renderHook(() => useDemoSequence(4, true, 900));
    expect(result.current).toBe(3);
  });
});

describe("Reveal", () => {
  it("sem IntersectionObserver o conteúdo já aparece", () => {
    vi.stubGlobal("IntersectionObserver", undefined);
    render(<Reveal><p>conteúdo</p></Reveal>);
    expect(screen.getByText("conteúdo").parentElement!.dataset.shown).toBe("true");
  });

  it("ao montar, marca a página como carregada (desliga a revelação de emergência)", () => {
    delete document.documentElement.dataset.hydrated;
    installObserver();
    render(<Reveal><p>conteúdo</p></Reveal>);
    expect(document.documentElement.dataset.hydrated).toBe("true");
  });

  it("marca o elemento quando ele entra na tela", () => {
    installObserver();
    render(<Reveal delay={2}><p>conteúdo</p></Reveal>);
    const wrapper = screen.getByText("conteúdo").parentElement!;
    expect(wrapper.dataset.shown).toBe("false");
    expect(wrapper.style.getPropertyValue("--reveal-delay")).toBe("100ms");
    act(() => observers[0]!.callback([{ isIntersecting: true }]));
    expect(wrapper.dataset.shown).toBe("true");
  });
});
