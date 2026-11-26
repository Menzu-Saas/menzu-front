import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { RgbPicker } from "@/components/settings/rgb-picker";
import { hexToRgb, rgbToHex } from "@/lib/color";

function Controlled({ start, onChange }: { start: string; onChange: (hex: string) => void }) {
  const [value, setValue] = useState(start);
  return <RgbPicker value={value} onChange={(hex) => { setValue(hex); onChange(hex); }} />;
}

const slider = (name: string) => screen.getByRole("slider", { name }) as HTMLInputElement;
const number = (name: string) => screen.getByRole("spinbutton", { name }) as HTMLInputElement;
const spectrum = () => screen.getByLabelText("Abrir o seletor de cores") as HTMLInputElement;

describe("conversão de cores", () => {
  it("converte entre #RRGGBB e R, G, B, limitando cada canal a 0–255", () => {
    expect(hexToRgb("#FF6B1A")).toEqual({ r: 255, g: 107, b: 26 });
    expect(rgbToHex({ r: 255, g: 107, b: 26 })).toBe("#FF6B1A");
    expect(rgbToHex({ r: 999, g: -5, b: 15.6 })).toBe("#FF0010");
    expect(hexToRgb("#FFF")).toBeNull();
    expect(hexToRgb("")).toBeNull();
  });
});

describe("seletor RGB da cor principal", () => {
  it("mostra os canais da cor atual", () => {
    render(<Controlled start="#12A150" onChange={() => {}} />);
    expect([slider("Vermelho (R)").value, slider("Verde (G)").value, slider("Azul (B)").value]).toEqual(["18", "161", "80"]);
    expect(number("Valor de vermelho").value).toBe("18");
    expect(spectrum().value).toBe("#12a150");
  });

  it("arrastar um canal gera a nova cor e mantém os outros", () => {
    const onChange = vi.fn();
    render(<Controlled start="#12A150" onChange={onChange} />);
    fireEvent.change(slider("Azul (B)"), { target: { value: "255" } });
    expect(onChange).toHaveBeenLastCalledWith("#12A1FF");
    expect(number("Valor de azul").value).toBe("255");
  });

  it("digitar um número fora do intervalo é limitado a 0–255; campo vazio não muda a cor", () => {
    const onChange = vi.fn();
    render(<Controlled start="#000000" onChange={onChange} />);
    fireEvent.change(number("Valor de vermelho"), { target: { value: "400" } });
    expect(onChange).toHaveBeenLastCalledWith("#FF0000");
    fireEvent.change(number("Valor de vermelho"), { target: { value: "" } });
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("o espectro completo devolve a cor em maiúsculas", () => {
    const onChange = vi.fn();
    render(<Controlled start="#000000" onChange={onChange} />);
    fireEvent.input(spectrum(), { target: { value: "#8e24aa" } });
    expect(onChange).toHaveBeenLastCalledWith("#8E24AA");
    expect(slider("Vermelho (R)").value).toBe("142");
  });

  it("na cor Padrão parte do laranja Menzu sem alterar o formulário sozinho", () => {
    const onChange = vi.fn();
    render(<Controlled start="" onChange={onChange} />);
    expect(slider("Vermelho (R)").value).toBe("255");
    expect(onChange).not.toHaveBeenCalled();
  });
});
