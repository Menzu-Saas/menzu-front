import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { CustomerPanel, type CpfState } from "@/components/checkout/customer-panel";

// jsdom não implementa a captura de ponteiro usada pela folha (Radix/vaul).
Element.prototype.setPointerCapture ??= () => {};
Element.prototype.releasePointerCapture ??= () => {};
Element.prototype.hasPointerCapture ??= () => false;

const value = { name: "Maria Souza", phone: "(81) 99999-9999", email: "", cpf: "" };
const cpf = (over: Partial<CpfState> = {}): CpfState => ({ deviceValue: "", savedLast3: null, signedIn: false, ...over });

function setup(state: CpfState, onConfirm = vi.fn(), cpfRequired = true) {
  render(<CustomerPanel open onOpenChange={() => {}} value={value} emailRequired={false} cpfRequired={cpfRequired} cpf={state} onConfirm={onConfirm} />);
  return onConfirm;
}

describe("CPF no painel Seus dados", () => {
  it("é obrigatório para pagar online: sem CPF não dá para salvar os dados", () => {
    const onConfirm = setup(cpf());
    expect(screen.queryByText(/CPF \(opcional\)/i)).toBeNull();
    expect((screen.getByRole("button", { name: "Salvar dados" }) as HTMLButtonElement).disabled).toBe(true);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("é opcional no pagamento presencial: salva sem CPF", async () => {
    const onConfirm = setup(cpf(), vi.fn(), false);
    expect(screen.getByText(/CPF \(opcional\)/i)).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: "Salvar dados" }));
    expect(onConfirm).toHaveBeenCalledWith(expect.objectContaining({ cpf: "" }));
  });

  it("mesmo opcional, recusa um CPF inválido digitado", async () => {
    setup(cpf(), vi.fn(), false);
    await userEvent.type(screen.getByPlaceholderText("000.000.000-00"), "11111111111");
    expect((screen.getByRole("button", { name: "Salvar dados" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("recusa CPF inválido", async () => {
    setup(cpf());
    const save = screen.getByRole("button", { name: "Salvar dados" }) as HTMLButtonElement;
    expect(save.disabled).toBe(true);
    await userEvent.type(screen.getByPlaceholderText("000.000.000-00"), "11111111111");
    expect(save.disabled).toBe(true);
  });

  it("formata, aceita um CPF válido e devolve só os dígitos", async () => {
    const onConfirm = setup(cpf());
    const input = screen.getByPlaceholderText("000.000.000-00") as HTMLInputElement;
    await userEvent.type(input, "52998224725");
    expect(input.value).toBe("529.982.247-25");
    await userEvent.click(screen.getByRole("button", { name: "Salvar dados" }));
    expect(onConfirm).toHaveBeenCalledWith(expect.objectContaining({ cpf: "52998224725" }));
  });

  it("com conta e CPF guardado, mostra só a máscara e não pede de novo", async () => {
    const onConfirm = setup(cpf({ signedIn: true, savedLast3: "725" }));
    expect(screen.getByText(/•••\.•••\.••7-25 cadastrado/)).toBeTruthy();
    expect(screen.queryByPlaceholderText("000.000.000-00")).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: "Salvar dados" }));
    expect(onConfirm).toHaveBeenCalledWith(expect.objectContaining({ cpf: "" }));
    await userEvent.click(screen.getByRole("button", { name: "Trocar" }));
    expect(screen.getByPlaceholderText("000.000.000-00")).toBeTruthy();
  });
});
