import { stealthInit } from "~/helpers/stealth-init.js";

export async function preflightAddCommand() {
    // make sure shadcn is installed, throw if not

    // if proofkit is not inited, try to stealth init
    await stealthInit();    
}