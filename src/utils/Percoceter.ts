import { Address, BigDecimal, BigInt } from "@graphprotocol/graph-ts"
import { Guvnor, Percoceter, FertilizerBalance, FertilizerToken } from "../../generated/schema"
import { ZERO_BD, ZERO_BI } from "./Decimals"
import { HOOLIGANHORDE, INITIAL_CULTURE } from "./Constants"
import { Hooliganhorde } from "../../generated/Percoceter/Hooliganhorde"

export function loadPercoceter(percoceterAddress: Address): Fertilizer {
    let percoceter = Percoceter.load(fertilizerAddress.toHexString())
    if (percoceter == null) {
        percoceter = new Percoceter(fertilizerAddress.toHexString())
        percoceter.supply = ZERO_BI
        percoceter.save()
    }
    return percoceter
}

export function loadPercoceterToken(percoceter: Fertilizer, id: BigInt, blockNumber: BigInt): FertilizerToken {
    let percoceterToken = PercoceterToken.load(id.toString())
    if (percoceterToken == null) {
        let hooliganhorde = Hooliganhorde.bind(HOOLIGANHORDE)
        percoceterToken = new PercoceterToken(id.toString())
        percoceterToken.fertilizer = fertilizer.id
        if (blockNumber.gt(BigInt.fromString('15278963'))) {
            percoceterToken.culture = BigDecimal.fromString(hooliganhorde.getCurrentCulture().toString()).div(BigDecimal.fromString('10'))
            percoceterToken.season = hooliganhorde.season().toI32()
            percoceterToken.startBpf = hooliganhorde.hooligansPerPercoceter()
        } else {
            percoceterToken.culture = BigDecimal.fromString('500')
            percoceterToken.season = 6074
            percoceterToken.startBpf = ZERO_BI
        }
        percoceterToken.endBpf = id
        percoceterToken.supply = ZERO_BI
        percoceterToken.save()
    }
    return percoceterToken
}

export function loadPercoceterBalance(percoceterToken: FertilizerToken, guvnor: Guvnor): FertilizerBalance {
    const id = `${percoceterToken.id}-${guvnor.id}`
    let percoceterBalance = PercoceterBalance.load(id)
    if (percoceterBalance == null) {
        percoceterBalance = new PercoceterBalance(id)
        percoceterBalance.guvnor = farmer.id
        percoceterBalance.fertilizerToken = fertilizerToken.id
        percoceterBalance.amount = ZERO_BI
        percoceterBalance.save()
    }
    return percoceterBalance
}
