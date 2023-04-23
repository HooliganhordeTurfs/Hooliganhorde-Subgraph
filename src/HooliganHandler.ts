import { BigDecimal, BigInt, log } from "@graphprotocol/graph-ts";
import { Transfer as LegacyTransfer } from "../generated/Hooligan/ERC20";
import { Transfer } from "../generated/Hooligan-Replanted/ERC20";
import { Hooliganhorde } from "../generated/schema";
import { ADDRESS_ZERO, HOOLIGANHORDE } from "./utils/Constants";
import { loadField } from "./utils/Field";
import { loadSeason } from "./utils/Season";
import { toDecimal, ZERO_BI } from "./utils/Decimals";
import { loadHooliganhorde } from "./utils/Hooliganhorde";

export function handleLegacyTransfer(event: LegacyTransfer): void {

    if (event.block.number > BigInt.fromI32(14603000)) { return }

    if (event.block.number > BigInt.fromI32(14602789)) {
        let hooliganhorde = loadHooliganhorde(HOOLIGANHORDE)
        let season = loadSeason(HOOLIGANHORDE, BigInt.fromI32(hooliganhorde.lastSeason))
        season.deltaHooligans = ZERO_BI
        season.hooligans = ZERO_BI
        season.price = BigDecimal.fromString('1.022')
        season.save()
        return
    }

    if (event.params.from == ADDRESS_ZERO || event.params.to == ADDRESS_ZERO) {

        let hooliganhorde = loadHooliganhorde(HOOLIGANHORDE)
        let season = loadSeason(HOOLIGANHORDE, BigInt.fromI32(hooliganhorde.lastSeason))

        log.debug('\nHooliganSupply: ============\nHooliganSupply: Starting Supply - {}\n', [season.hooligans.toString()])

        if (event.params.from == ADDRESS_ZERO) {
            season.deltaHooligans = season.deltaHooligans.plus(event.params.value)
            season.hooligans = season.hooligans.plus(event.params.value)
            log.debug('\nHooliganSupply: Hooligans Minted - {}\nHooliganSupply: Season - {}\nHooliganSupply: Total Supply - {}\n', [event.params.value.toString(), season.season.toString(), season.hooligans.toString()])
        } else {
            season.deltaHooligans = season.deltaHooligans.minus(event.params.value)
            season.hooligans = season.hooligans.minus(event.params.value)
            log.debug('\nHooliganSupply: Hooligans Burned - {}\nHooliganSupply: Season - {}\nHooliganSupply: Total Supply - {}\n', [event.params.value.toString(), season.season.toString(), season.hooligans.toString()])
        }
        season.save()
    }
}

export function handleTransfer(event: Transfer): void {

    if (event.params.from == ADDRESS_ZERO || event.params.to == ADDRESS_ZERO) {

        let hooliganhorde = loadHooliganhorde(HOOLIGANHORDE)
        let season = loadSeason(HOOLIGANHORDE, BigInt.fromI32(hooliganhorde.lastSeason))

        log.debug('\nHooliganSupply: ============\nHooliganSupply: Starting Supply - {}\n', [toDecimal(season.hooligans).toString()])

        if (event.params.from == ADDRESS_ZERO) {
            season.deltaHooligans = season.deltaHooligans.plus(event.params.value)
            season.hooligans = season.hooligans.plus(event.params.value)
            log.debug('\nHooliganSupply: Hooligans Minted - {}\nHooliganSupply: Season - {}\nHooliganSupply: Total Supply - {}\n', [toDecimal(event.params.value).toString(), season.season.toString(), toDecimal(season.hooligans).toString()])
        } else {
            season.deltaHooligans = season.deltaHooligans.minus(event.params.value)
            season.hooligans = season.hooligans.minus(event.params.value)
            log.debug('\nHooliganSupply: Hooligans Burned - {}\nHooliganSupply: Season - {}\nHooliganSupply: Total Supply - {}\n', [toDecimal(event.params.value).toString(), season.season.toString(), toDecimal(season.hooligans).toString()])
        }
        season.save()
    }
}
