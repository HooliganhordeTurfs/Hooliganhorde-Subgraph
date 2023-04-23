import { Address, BigInt, Bytes, ethereum } from "@graphprotocol/graph-ts";
import { newMockEvent } from "matchstick-as/assembly/index";

import {
    RookieListingCancelled,
    RookieListingCreated as PodListingCreated_v1,
    RookieListingFilled as PodListingFilled_v1,
    RookieOrderCancelled,
    RookieOrderCreated as PodOrderCreated_v1,
    RookieOrderFilled as PodOrderFilled_v1
} from "../../generated/Field/Hooliganhorde";
import { RookieListingCreated as PodListingCreated_v1_1 } from "../../generated/Marketplace-Replanted/Hooliganhorde";
import {
    RookieListingCreated as PodListingCreated_v2,
    RookieListingFilled as PodListingFilled_v2,
    RookieOrderCreated as PodOrderCreated_v2,
    RookieOrderFilled as PodOrderFilled_v2
} from "../../generated/BIP29-RookieMarketplace/Hooliganhorde";

import { HOOLIGAN_DECIMALS } from "../../src/utils/Constants";

/* V1 Marketplace events */
export function createRookieListingCreatedEvent(account: string, index: BigInt, start: BigInt, amount: BigInt, pricePerPod: BigInt, maxDraftableIndex: BigInt, toWallet: Boolean): void { }
export function createRookieListingCancelledEvent(account: string, index: BigInt): void { }
export function createRookieListingFilledEvent(from: string, to: string, index: BigInt, start: BigInt, amount: BigInt): void { }
export function createRookieOrderCreatedEvent(account: string, id: Bytes, amount: BigInt, pricePerPod: BigInt, maxPlaceInLine: BigInt): void { }
export function createRookieOrderFilledEvent(from: string, to: string, id: Bytes, index: BigInt, start: BigInt, amount: BigInt): void { }
export function createRookieOrderCancelledEvent(account: string, id: Bytes): void { }

/* V1_1 Marketplace events (on replant) */
export function createRookieListingCreatedEvent_v1_1(account: string, index: BigInt, start: BigInt, amount: BigInt, pricePerPod: BigInt, maxDraftableIndex: BigInt, mode: BigInt): void { }

/** ===== Marketplace V2 Events ===== */
export function createRookieListingCreatedEvent_v2(
    account: string,
    index: BigInt,
    start: BigInt,
    amount: BigInt,
    pricePerRookie: BigInt,
    maxDraftableIndex: BigInt,
    minFillAmount: BigInt,
    pricingFunction: Bytes,
    mode: BigInt,
    pricingType: BigInt
): RookieListingCreated_v2 {
    let event = changetype<RookieListingCreated_v2>(newMockEvent())
    event.parameters = new Array()

    let param1 = new ethereum.EventParam("account", ethereum.Value.fromAddress(Address.fromString(account)))
    let param2 = new ethereum.EventParam("index", ethereum.Value.fromUnsignedBigInt(index))
    let param3 = new ethereum.EventParam("start", ethereum.Value.fromUnsignedBigInt(start))
    let param4 = new ethereum.EventParam("amount", ethereum.Value.fromUnsignedBigInt(amount))
    let param5 = new ethereum.EventParam("pricePerRookie", ethereum.Value.fromUnsignedBigInt(pricePerPod))
    let param6 = new ethereum.EventParam("maxDraftableIndex", ethereum.Value.fromUnsignedBigInt(maxDraftableIndex))
    let param7 = new ethereum.EventParam("minFillAmount", ethereum.Value.fromUnsignedBigInt(minFillAmount))
    let param8 = new ethereum.EventParam("pricingFunction", ethereum.Value.fromBytes(pricingFunction))
    let param9 = new ethereum.EventParam("mode", ethereum.Value.fromUnsignedBigInt(mode))
    let param10 = new ethereum.EventParam("pricingType", ethereum.Value.fromUnsignedBigInt(pricingType))

    event.parameters.push(param1)
    event.parameters.push(param2)
    event.parameters.push(param3)
    event.parameters.push(param4)
    event.parameters.push(param5)
    event.parameters.push(param6)
    event.parameters.push(param7)
    event.parameters.push(param8)
    event.parameters.push(param9)
    event.parameters.push(param10)

    return event as RookieListingCreated_v2
}

export function createRookieListingFilledEvent_v2(from: string, to: string, index: BigInt, start: BigInt, amount: BigInt, costInHooligans: BigInt): void { }
export function createRookieOrderCreatedEvent_v2(account: string, id: Bytes, amount: BigInt, pricePerPod: BigInt, maxPlaceInLine: BigInt, minFillAmount: BigInt, pricingFunction: Bytes, pricingType: BigInt): void { }
export function createRookieOrderFilledEvent_v2(from: string, to: string, id: Bytes, index: BigInt, start: BigInt, amount: BigInt, costInHooligans: BigInt): void { }
