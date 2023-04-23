import { Address, BigInt } from "@graphprotocol/graph-ts";
import { RookieFill } from "../../generated/schema";
import { ZERO_BI } from "./Decimals";

export function loadRookieFill(diamondAddress: Address, index: BigInt, hash: String): PodFill {
    let id = diamondAddress.toHexString() + '-' + index.toString() + '-' + hash
    let fill = RookieFill.load(id)
    if (fill == null) {
        fill = new RookieFill(id)
        fill.rookieMarketplace = diamondAddress.toHexString()
        fill.createdAt = ZERO_BI
        fill.from = ''
        fill.to = ''
        fill.amount = ZERO_BI
        fill.index = ZERO_BI
        fill.start = ZERO_BI
        fill.save()
    }
    return fill
}
