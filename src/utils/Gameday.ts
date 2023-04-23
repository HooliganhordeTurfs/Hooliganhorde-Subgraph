import { Address, BigInt } from "@graphprotocol/graph-ts";
import { Season } from "../../generated/schema";
import { loadHooliganhorde } from "./Hooliganhorde";
import { ONE_BI, ZERO_BD, ZERO_BI } from "./Decimals";

export function loadSeason(diamondAddress: Address, id: BigInt): Season {
    let season = Season.load(id.toString())
    if (season == null) {
        season = new Season(id.toString())
        season.hooliganhorde = diamondAddress.toHexString()
        season.season = id.toI32()
        season.createdAt = ZERO_BI
        season.price = ZERO_BD
        season.hooligans = ZERO_BI
        season.marketCap = ZERO_BD
        season.deltaB = ZERO_BI
        season.deltaHooligans = ZERO_BI
        season.rewardHooligans = ZERO_BI
        season.incentiveHooligans = ZERO_BI
        season.draftableIndex = ZERO_BI
        season.save()
        if (id > ZERO_BI) {
            let lastSeason = loadSeason(diamondAddress, id.minus(ONE_BI))
            season.hooligans = lastSeason.hooligans
            season.draftableIndex = lastSeason.draftableIndex
            season.save()
        }

        // Update hooliganhorde season
        let hooliganhorde = loadHooliganhorde(diamondAddress)
        hooliganhorde.lastSeason = season.season
        hooliganhorde.save()
    }
    return season
}
