const {test} = require("node:test");
const assert = require("node:assert/strict");
const {chromium} = require(process.env.PLAYWRIGHT_MODULE || "playwright");

test("the inspector opens each name editor when its own number is valid", async t => {
  const browser = await chromium.launch();
  t.after(() => browser.close());
  const page = await browser.newPage();
  await page.goto(process.env.STUDIO_URL || "http://127.0.0.1:4187/noptis-studio/");
  const gid = page.getByLabel("GID", {exact: true});
  const button = name => page.getByRole("button", {name, exact: true});
  const organization = page.getByLabel("Organization name");

  const addDescription = button("Add description");

  await gid.fill("9031007");
  await button("Add name for 007").click();
  await organization.fill("Authority");
  await button("Save").click();
  await button("Edit name for 007").waitFor();
  await page.getByText("Authority", {exact: true}).waitFor();
  assert.equal(await addDescription.isDisabled(), true);

  await gid.fill("90310076666");
  await button("Add name for 6666").click();
  await organization.fill("Operator");
  await button("Save").click();
  await button("Edit name for 6666").waitFor();
  assert.equal(await addDescription.isDisabled(), true);

  await page.reload();
  await gid.fill("9031007");
  await button("Edit name for 007").click();
  assert.equal(await organization.inputValue(), "Authority");
  await button("Cancel").click();
  await gid.fill("90310076666");
  await button("Edit name for 6666").click();
  assert.equal(await organization.inputValue(), "Operator");
  await button("Cancel").click();

  await gid.fill("9031007666612345");
  await addDescription.click();
  await page.getByLabel("Description").waitFor();
  await button("Cancel").click();
  await gid.fill("903100766661234");
  await button("Edit name for 007").waitFor();
  await button("Edit name for 6666").waitFor();
  assert.equal(await addDescription.isDisabled(), true);
  await gid.fill("9031007666");
  await button("Edit name for 007").waitFor();
  assert.equal(await button("Add name for 666").count(), 0);

  await gid.fill("9010123000000001");
  await button("Add name for 123").waitFor();
  assert.equal(await addDescription.isDisabled(), true);
  await button("EN").click();
  await button("TPA-nummer").waitFor();
  await button("Lägg till namn för 123").click();
  await page.getByLabel("Organisationsnamn").waitFor();
  await button("Close modal").click();
  assert.equal(await button("Lägg till beskrivning").isDisabled(), true);
  await gid.fill("9999");
  assert.equal(await page.locator("#gid-type-heading").count(), 0);
});
