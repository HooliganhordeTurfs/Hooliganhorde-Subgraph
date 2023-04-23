import { FirmYield } from "../../generated/schema";
import { ZERO_BD, ZERO_BI } from "./Decimals";

export function loadFirmYield(season: i32): FirmYield {
    let firmYield = FirmYield.load(season.toString())
    if (firmYield == null) {
        firmYield = new FirmYield(season.toString())
        firmYield.season = season
        firmYield.beta = ZERO_BD
        firmYield.u = 0
        firmYield.hooligansPerSeasonEMA = ZERO_BD
        firmYield.twoProspectHooliganAPY = ZERO_BD
        firmYield.twoProspectHordeAPY = ZERO_BD
        firmYield.fourProspectHooliganAPY = ZERO_BD
        firmYield.fourProspectHordeAPY = ZERO_BD
        firmYield.createdAt = ZERO_BI
        firmYield.save()
    }
    return firmYield as FirmYield
}
