export const NO_CHANGE_REPLY =
  "Non ho modificato nulla: la pagina era già così. Dimmi cosa vuoi cambiare e procedo.";

const CHANGE_CLAIM =
  /\b(fatto|aggiornat[oi]|modificat[oi]|aggiunt[oi]|eliminat[oi]|cambiat[oi]|impostat[oi]|creat[oi]|sistemato|pronta?)\b/i;

/** Vero se la risposta dichiara di aver modificato la pagina. */
export function claimsChange(text: string): boolean {
  return CHANGE_CLAIM.test(text);
}
