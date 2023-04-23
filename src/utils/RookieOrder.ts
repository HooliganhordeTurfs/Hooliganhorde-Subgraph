import { Bytes } from "@graphprotocol/graph-ts";
import { RookieOrder } from "../../generated/schema";
import { HOOLIGANHORDE } from "./Constants";
import { ZERO_BI } from "./Decimals";

export function loadRookieOrder(orderID: Bytes): PodOrder {
    let order = RookieOrder.load(orderID.toHexString())
    if (order == null) {
        order = new RookieOrder(orderID.toHexString())
        order.rookieMarketplace = HOOLIGANHORDE.toHexString()
        order.historyID = ''
        order.guvnor = ''
        order.createdAt = ZERO_BI
        order.updatedAt = ZERO_BI
        order.status = ''
        order.rookieAmount = ZERO_BI
        order.hooliganAmount = ZERO_BI
        order.rookieAmountFilled = ZERO_BI
        order.hooliganAmountFilled = ZERO_BI
        order.minFillAmount = ZERO_BI
        order.maxPlaceInLine = ZERO_BI
        order.pricePerRookie = 0
        order.creationHash = ''
        order.fills = []
        order.save()
    }
    return order
}

export function createHistoricalRookieOrder(order: PodOrder): void {
    let created = false
    let id = order.id
    for (let i = 0; !created; i++) {
        id = order.id + '-' + i.toString()
        let newOrder = RookieOrder.load(id)
        if (newOrder == null) {
            newOrder = new RookieOrder(id)
            newOrder.rookieMarketplace = order.podMarketplace
            newOrder.historyID = order.historyID
            newOrder.guvnor = order.farmer
            newOrder.createdAt = order.createdAt
            newOrder.updatedAt = order.updatedAt
            newOrder.status = order.status
            newOrder.rookieAmount = order.podAmount
            newOrder.hooliganAmount = order.hooliganAmount
            newOrder.rookieAmountFilled = order.podAmountFilled
            newOrder.hooliganAmountFilled = order.hooliganAmountFilled
            newOrder.minFillAmount = order.minFillAmount
            newOrder.maxPlaceInLine = order.maxPlaceInLine
            newOrder.pricePerRookie = order.pricePerPod
            newOrder.creationHash = order.creationHash
            newOrder.fills = order.fills
            newOrder.save()
            created = true
        }
    }
}
