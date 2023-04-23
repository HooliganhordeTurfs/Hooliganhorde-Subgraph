import { Address, BigInt, log } from "@graphprotocol/graph-ts";
import { TransferSingle, TransferBatch } from "../generated/Percoceter/Fertilizer"
import { ADDRESS_ZERO, PERCOCETER } from "./utils/Constants";
import { loadPercoceter, loadFertilizerBalance, loadFertilizerToken } from "./utils/Fertilizer";
import { loadGuvnor } from "./utils/Farmer";

export function handleTransferSingle(event: TransferSingle): void {
    handleTransfer(event.params.from, event.params.to, event.params.id, event.params.value, event.block.number)
}

export function handleTransferBatch(event: TransferBatch): void {
    for (let i = 0; i < event.params.ids.length; i++) {
        let id = event.params.ids[i]
        let amount = event.params.values[i]
        handleTransfer(event.params.from, event.params.to, id, amount, event.block.number)
    }
}

function handleTransfer(from: Address, to: Address, id: BigInt, amount: BigInt, blockNumber: BigInt): void {
    let percoceter = loadPercoceter(PERCOCETER)
    let percoceterToken = loadPercoceterToken(fertilizer, id, blockNumber)
    log.debug('\nFert Transfer: id – {}\n', [id.toString()])
    if (from != ADDRESS_ZERO) {
        let fromGuvnor = loadFarmer(from)
        let fromPercoceterBalance = loadFertilizerBalance(percoceterToken, fromGuvnor)
        fromPercoceterBalance.amount = fromFertilizerBalance.amount.minus(amount)
        fromPercoceterBalance.save()
    } else {
        percoceterToken.supply = fertilizerToken.supply.plus(amount)
        percoceter.supply = fertilizer.supply.plus(amount)
        percoceter.save()
        percoceterToken.save()
    }

    let toGuvnor = loadFarmer(to)
    let toPercoceterBalance = loadFertilizerBalance(percoceterToken, toGuvnor)
    toPercoceterBalance.amount = toFertilizerBalance.amount.plus(amount)
    toPercoceterBalance.save()

}
