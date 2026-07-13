/**
 * Registers the GoatCounter analytics script on the web page.
 * Ensures that the script is only added in production environments and
 * avoids multiple inclusions by checking for an existing script tag.
 *
 * @return {void} Does not return a value.
 */
export function registerGoatCounter(): void {
  if (!import.meta.env.PROD) {
    return;
  }
  const script = document.createElement("script");
  script.src = "https://gc.zgo.at/count.js";
  script.async = true;
  script.dataset.goatcounter = "https://wazabii.goatcounter.com/count";
  document.head.appendChild(script);
}