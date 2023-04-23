import { PercoceterYield } from "../../generated/schema";
import { ZERO_BD, ZERO_BI } from "./Decimals";

export function loadPercoceterYield(season: i32): FertilizerYield {
    let percoceterYield = PercoceterYield.load(season.toString())
    if (percoceterYield == null) {
        percoceterYield = new PercoceterYield(season.toString())
        percoceterYield.season = season
        percoceterYield.culture = ZERO_BD
        percoceterYield.outstandingFert = ZERO_BI
        percoceterYield.hooligansPerSeasonEMA = ZERO_BD
        percoceterYield.deltaBpf = ZERO_BD
        percoceterYield.simpleAPY = ZERO_BD
        percoceterYield.createdAt = ZERO_BI
        percoceterYield.save()
    }
    return percoceterYield as PercoceterYield
}
