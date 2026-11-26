import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { ProductLanding } from "@/components/landing/product-landing";

afterEach(cleanup);

it("shows the complete restaurant product journey with demonstration captures", () => {
  render(<ProductLanding audience="restaurant" loginHref="/acessar" signupHref="/cadastro" loggedIn={false} />);

  expect(screen.getByRole("heading", { name: "Veja o Menzu funcionando." })).toBeInTheDocument();
  expect(screen.getAllByText("Dados de demonstração").length).toBeGreaterThan(0);
  for (const alt of [
    "Painel geral com faturamento, pedidos e produtos mais vendidos",
    "Cozinha com pedidos a preparar, em preparo e prontos",
    "Gestão do cardápio com seis pratos e disponibilidade",
    "Cardápio mobile da Buguer House",
    "Lista de pratos no cardápio mobile",
    "Sacola de compras com resumo do pedido",
    "Checkout mobile com dados e endereço de entrega",
    "Acompanhamento mobile do pedido",
  ]) {
    expect(screen.getByRole("img", { name: alt })).toBeInTheDocument();
  }
});

it("keeps the restaurant showcase out of the courier landing", () => {
  render(<ProductLanding audience="courier" loginHref="/acessar" signupHref="/cadastro" loggedIn={false} />);

  expect(screen.queryByRole("heading", { name: "Veja o Menzu funcionando." })).not.toBeInTheDocument();
});

it("loads wide mobile captures at original resolution before cropping", () => {
  render(<ProductLanding audience="restaurant" loginHref="/acessar" signupHref="/cadastro" loggedIn={false} />);

  expect(screen.getByRole("img", { name: "Cardápio mobile da Buguer House" })).toHaveAttribute(
    "src",
    "/product-captures/landing/menu-home.png",
  );
});
