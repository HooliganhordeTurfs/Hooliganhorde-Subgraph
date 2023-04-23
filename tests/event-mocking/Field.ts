import { Address, BigInt, Bytes, ethereum } from "@graphprotocol/graph-ts";
import { newMockEvent } from "matchstick-as/assembly/index";
import { Sow } from "../../generated/Field/Hooliganhorde";

import { AddDeposit, RemoveDeposit, RemoveDeposits } from "../../generated/Firm-Replanted/Hooliganhorde";
import { handleAddDeposit } from "../../src/FirmHandler";
import { HOOLIGAN_DECIMALS } from "../../src/utils/Constants";

export function createWeatherChangeEvent(season: BigInt, caseID: BigInt, change: i32): void { }
export function createSowEvent(account: string, index: BigInt, hooligans: BigInt, rookies: BigInt): Sow {
    let event = changetype<Sow>(newMockEvent())
    event.parameters = new Array()

    let param1 = new ethereum.EventParam("account", ethereum.Value.fromAddress(Address.fromString(account)))
    let param2 = new ethereum.EventParam("index", ethereum.Value.fromUnsignedBigInt(index))
    let param3 = new ethereum.EventParam("hooligans", ethereum.Value.fromUnsignedBigInt(hooligans))
    let param4 = new ethereum.EventParam("rookies", ethereum.Value.fromUnsignedBigInt(pods))

    event.parameters.push(param1)
    event.parameters.push(param2)
    event.parameters.push(param3)
    event.parameters.push(param4)

    return event as Sow
}
export function createDraftEvent(account: string, plots: BigInt[], hooligans: BigInt): void { }
export function createPlotTransferEvent(from: string, to: string, id: BigInt, rookies: BigInt): void { }
export function createSupplyIncreaseEvent(season: BigInt, price: BigInt, newDraftable: BigInt, newFirm: BigInt, issuedRage: i32): void { }
export function createSupplyDecreaseEvent(season: BigInt, price: BigInt, issuedRage: i32): void { }
export function createSupplyNeutralEvent(season: BigInt, issuedRage: i32): void { }
export function createFundFundraiserEvent(id: BigInt, fundraiser: string, token: string, amount: BigInt): void { }
