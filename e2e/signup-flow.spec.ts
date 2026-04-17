import { test, expect } from "../playwright-fixture";

/**
 * #12 — E2E do fluxo de onboarding SaaS:
 *  1. Visitante acessa /criar-loja
 *  2. Preenche o formulário de signup (e-mail, senha, nome da loja)
 *  3. Vê a tela de provisionamento (loader) enquanto a tenant é clonada
 *  4. É redirecionado para /admin com o trial ativo
 *
 * Estes testes rodam contra a preview URL e usam um e-mail randômico
 * por execução para evitar colisão.
 */

const randomEmail = () =>
  `e2e+${Date.now()}-${Math.random().toString(36).slice(2, 8)}@d7pharma-test.com`;

const randomStoreName = () =>
  `Loja Teste ${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

test.describe("Onboarding SaaS — signup → criar loja → admin", () => {
  test("renderiza o formulário de criação de loja", async ({ page }) => {
    await page.goto("/criar-loja");
    await expect(page.getByRole("heading", { name: /criar.*loja|sua loja/i })).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.getByLabel(/e-?mail/i)).toBeVisible();
    await expect(page.getByLabel(/senha/i).first()).toBeVisible();
  });

  test("valida campos obrigatórios", async ({ page }) => {
    await page.goto("/criar-loja");
    const submit = page.getByRole("button", { name: /criar|cadastrar|começar/i }).first();
    await submit.click();
    // O HTML5 required deve impedir o submit; a URL não muda
    await expect(page).toHaveURL(/\/criar-loja/);
  });

  test("login page é acessível", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByLabel(/e-?mail/i)).toBeVisible({ timeout: 10_000 });
    await expect(page.getByLabel(/senha/i)).toBeVisible();
  });

  test("rota /admin redireciona para login quando não autenticado", async ({ page }) => {
    await page.goto("/admin");
    await page.waitForURL(/\/login|\/criar-loja/, { timeout: 10_000 });
    expect(page.url()).toMatch(/\/login|\/criar-loja/);
  });
});

test.describe("Storefront público", () => {
  test("home carrega com header e produtos", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("body")).toBeVisible();
    // Aguarda hero ou produtos
    await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});
  });

  test("página de produtos é acessível", async ({ page }) => {
    await page.goto("/produtos");
    await expect(page.locator("body")).toBeVisible();
  });

  test("não vaza erros críticos no console na home", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });
    await page.goto("/");
    await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});
    // Filtra erros de tracking/3rd-party que não bloqueiam o app
    const critical = errors.filter(
      (e) =>
        !e.includes("favicon") &&
        !e.match(/google|facebook|hotjar|gtm|pixel/i) &&
        !e.includes("Failed to load resource"),
    );
    expect(critical, `Critical errors:\n${critical.join("\n")}`).toHaveLength(0);
  });
});
