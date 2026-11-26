import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ColorPicker } from "@/components/settings/color-picker";
import { hexToRgb, hsvToRgb, hslToRgb, rgbToHex, rgbToHsl, rgbToHsv } from "@/lib/color";

function Controlled({ start, onChange = () => {} }: { start: string; onChange?: (hex: string) => void }) {
  const [value, setValue] = useState(start);
  return (
    <>
      <button onClick={() => setValue("#FF0000")}>cor de fora</button>
      <ColorPicker value={value} onChange={(hex) => { setValue(hex); onChange(hex); }} />
    </>
  );
}

const area = () => screen.getByRole("slider", { name: "Saturação e brilho" });
const hue = () => screen.getByRole("slider", { name: "Matiz" }) as HTMLInputElement;
const field = (name: string) => screen.getByRole("textbox", { name }) as HTMLInputElement;
const tab = (name: string) => screen.getByRole("button", { name });
const pointer = (type: string, clientX: number, clientY: number) => new MouseEvent(type, { bubbles: true, clientX, clientY, button: 0 });
const sizeArea = () => { area().getBoundingClientRect = () => ({ left: 0, top: 0, width: 200, height: 100, right: 200, bottom: 100, x: 0, y: 0, toJSON: () => ({}) }); };

afterEach(() => { delete (window as { EyeDropper?: unknown }).EyeDropper; });

describe("conversões", () => {
  it("HEX, RGB, HSB e HSL vão e voltam", () => {
    for (const hex of ["#FF6B1A", "#12A150", "#1A1614", "#FFFFFF", "#000000", "#7038F4"]) {
      const rgb = hexToRgb(hex)!;
      expect(rgbToHex(hsvToRgb(rgbToHsv(rgb)))).toBe(hex);
      expect(rgbToHex(hslToRgb(rgbToHsl(rgb)))).toBe(hex);
    }
    expect(rgbToHsv({ r: 255, g: 0, b: 0 })).toEqual({ h: 0, s: 1, v: 1 });
    expect(rgbToHsl({ r: 0, g: 0, b: 255 })).toEqual({ h: 240, s: 1, l: 0.5 });
  });
});

describe("área de cor", () => {
  it("clicar e arrastar escolhe saturação (esquerda-direita) e brilho (cima-baixo)", () => {
    const onChange = vi.fn();
    render(<Controlled start="#FF0000" onChange={onChange} />);
    sizeArea();
    fireEvent(area(), pointer("pointerdown", 200, 0));
    expect(onChange).toHaveBeenLastCalledWith("#FF0000");
    fireEvent(area(), pointer("pointermove", 0, 0));
    expect(onChange).toHaveBeenLastCalledWith("#FFFFFF");
    fireEvent(area(), pointer("pointermove", 100, 50));
    expect(onChange).toHaveBeenLastCalledWith("#804040");
    fireEvent(area(), pointer("pointermove", 900, 900));
    expect(onChange).toHaveBeenLastCalledWith("#000000");
    fireEvent(area(), pointer("pointerup", 0, 0));
    onChange.mockClear();
    fireEvent(area(), pointer("pointermove", 10, 10));
    expect(onChange).not.toHaveBeenCalled();
  });

  it("não perde o matiz ao passar pelo preto ou pelo branco", () => {
    render(<Controlled start="#0000FF" />);
    sizeArea();
    fireEvent(area(), pointer("pointerdown", 0, 100));
    expect(hue().value).toBe("240");
    fireEvent(area(), pointer("pointermove", 200, 0));
    expect(field("Código HEX").value).toBe("#0000FF");
  });

  it("funciona pelo teclado", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<Controlled start="#FF0000" onChange={onChange} />);
    area().focus();
    await user.keyboard("{ArrowDown}");
    expect(onChange).toHaveBeenLastCalledWith("#FC0000");
    await user.keyboard("{Shift>}{ArrowLeft}{/Shift}");
    expect(onChange).toHaveBeenLastCalledWith("#FC1919");
  });
});

describe("matiz, campos e formatos", () => {
  it("a barra de matiz muda o tom mantendo saturação e brilho", () => {
    const onChange = vi.fn();
    render(<Controlled start="#FF0000" onChange={onChange} />);
    fireEvent.change(hue(), { target: { value: "120" } });
    expect(onChange).toHaveBeenLastCalledWith("#00FF00");
  });

  it("HEX: só aplica quando o código está completo; incompleto volta ao sair do campo", () => {
    const onChange = vi.fn();
    render(<Controlled start="#12A150" onChange={onChange} />);
    fireEvent.change(field("Código HEX"), { target: { value: "#8e2" } });
    expect(onChange).not.toHaveBeenCalled();
    expect(field("Código HEX").value).toBe("#8E2");
    fireEvent.blur(field("Código HEX"));
    expect(field("Código HEX").value).toBe("#12A150");
    fireEvent.change(field("Código HEX"), { target: { value: "8e24aa" } });
    expect(onChange).toHaveBeenLastCalledWith("#8E24AA");
  });

  it("abas RGB, HSB e HSL mostram e editam a mesma cor", () => {
    const onChange = vi.fn();
    render(<Controlled start="#0000FF" onChange={onChange} />);
    fireEvent.click(tab("RGB"));
    expect([field("R").value, field("G").value, field("B").value]).toEqual(["0", "0", "255"]);
    fireEvent.change(field("R"), { target: { value: "999" } });
    expect(onChange).toHaveBeenLastCalledWith("#FF00FF");
    fireEvent.click(tab("HSB"));
    expect([field("H").value, field("S").value, field("B").value]).toEqual(["300", "100", "100"]);
    fireEvent.change(field("B"), { target: { value: "50" } });
    expect(onChange).toHaveBeenLastCalledWith("#800080");
    fireEvent.click(tab("HSL"));
    expect([field("H").value, field("S").value, field("L").value]).toEqual(["300", "100", "25"]);
    fireEvent.change(field("H"), { target: { value: "120" } });
    expect(onChange).toHaveBeenLastCalledWith("#008000");
    expect(tab("HSL").getAttribute("aria-pressed")).toBe("true");
  });

  it("acompanha uma cor escolhida fora do seletor", () => {
    render(<Controlled start="#0000FF" />);
    fireEvent.click(screen.getByText("cor de fora"));
    expect(field("Código HEX").value).toBe("#FF0000");
    expect(hue().value).toBe("0");
  });

  it("na cor Padrão parte do laranja Menzu sem alterar o formulário", () => {
    const onChange = vi.fn();
    render(<Controlled start="" onChange={onChange} />);
    expect(field("Código HEX").value).toBe("#FF6B1A");
    expect(onChange).not.toHaveBeenCalled();
  });
});

describe("conta-gotas", () => {
  it("não aparece em navegador sem suporte", () => {
    render(<Controlled start="#0000FF" />);
    expect(screen.queryByRole("button", { name: "Pegar uma cor da tela" })).toBeNull();
  });

  it("aplica a cor pega da tela; cancelar não muda nada", async () => {
    const open = vi.fn().mockRejectedValueOnce(new Error("AbortError")).mockResolvedValueOnce({ sRGBHex: "#1ebccf" });
    (window as { EyeDropper?: unknown }).EyeDropper = class { open = open; };
    const onChange = vi.fn();
    render(<Controlled start="#0000FF" onChange={onChange} />);
    const button = screen.getByRole("button", { name: "Pegar uma cor da tela" });
    await act(async () => { fireEvent.click(button); });
    expect(onChange).not.toHaveBeenCalled();
    await act(async () => { fireEvent.click(button); });
    expect(onChange).toHaveBeenLastCalledWith("#1EBCCF");
  });
});
