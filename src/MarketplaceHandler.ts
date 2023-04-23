import { Address, BigInt } from "@graphprotocol/graph-ts";
import {
    RookieListingCancelled,
    RookieListingCreated as PodListingCreated_v1,
    RookieListingFilled as PodListingFilled_v1,
    RookieOrderCancelled,
    RookieOrderCreated as PodOrderCreated_v1,
    RookieOrderFilled as PodOrderFilled_v1
} from "../generated/Field/Hooliganhorde";
import { RookieListingCreated as PodListingCreated_v1_1 } from "../generated/Marketplace-Replanted/Hooliganhorde";
import {
    RookieListingCreated as PodListingCreated_v2,
    RookieListingFilled as PodListingFilled_v2,
    RookieOrderCreated as PodOrderCreated_v2,
    RookieOrderFilled as PodOrderFilled_v2
} from "../generated/BIP29-RookieMarketplace/Hooliganhorde";

import {
    Plot,
    RookieListingCreated as PodListingCreatedEvent,
    RookieListingFilled as PodListingFilledEvent,
    RookieListingCancelled as PodListingCancelledEvent,
    RookieOrderCreated as PodOrderCreatedEvent,
    RookieOrderFilled as PodOrderFilledEvent,
    RookieOrderCancelled as PodOrderCancelledEvent
} from "../generated/schema";
import { toDecimal, ZERO_BI } from "./utils/Decimals";
import { loadGuvnor } from "./utils/Farmer";
import { loadPlot } from "./utils/Plot";
import { loadRookieFill } from "./utils/PodFill";
import { createHistoricalRookieListing, loadPodListing } from "./utils/PodListing";
import { loadRookieMarketplace, loadPodMarketplaceDailySnapshot, loadPodMarketplaceHourlySnapshot } from "./utils/PodMarketplace";
import { createHistoricalRookieOrder, loadPodOrder } from "./utils/PodOrder";

/* ------------------------------------
 * ROOKIE MARKETPLACE V1
 * 
 * Proposal: BIP-11 https://hooligan.money/bip-11
 * Deployed: 02/05/2022 @ block 14148509
 * Code: https://github.com/HooliganhordeFarms/Hooliganhorde/commit/75a67fc94cf2637ac1d7d7c89645492e31423fed
 * ------------------------------------
 */

export function handleRookieListingCreated(event: PodListingCreated_v1): void {
    let plotCheck = Plot.load(event.params.index.toString())
    if (plotCheck == null) { return }
    let plot = loadPlot(event.address, event.params.index)

    /// Upsert rookie listing
    let listing = loadRookieListing(event.params.account, event.params.index)
    if (listing.createdAt !== ZERO_BI) {
        createHistoricalRookieListing(listing)
        listing.status = 'ACTIVE'
        listing.createdAt = ZERO_BI
        listing.fill = null
        listing.filled = ZERO_BI
        listing.filledAmount = ZERO_BI
        listing.cancelledAmount = ZERO_BI
    }

    // Identifiers
    listing.historyID = listing.id + '-' + event.block.timestamp.toString()
    listing.plot = plot.id

    // Configuration
    listing.start = event.params.start
    listing.mode = event.params.toWallet === true ? 0 : 1

    // Constraints
    listing.maxDraftableIndex = event.params.maxDraftableIndex

    // Pricing
    listing.pricePerRookie = event.params.pricePerPod

    // Amounts [Relative to Original]
    listing.originalIndex = event.params.index
    listing.originalAmount = event.params.amount

    // Amounts [Relative to Child]
    listing.amount = event.params.amount // in Rookies
    listing.remainingAmount = listing.originalAmount

    // Metadata
    listing.createdAt = listing.createdAt == ZERO_BI ? event.block.timestamp : listing.createdAt
    listing.updatedAt = event.block.timestamp
    listing.creationHash = event.transaction.hash.toHexString()
    listing.save()

    /// Update plot
    plot.listing = listing.id
    plot.save()

    /// Update market totals
    updateMarketListingBalances(event.address, plot.index, event.params.amount, ZERO_BI, ZERO_BI, ZERO_BI, event.block.timestamp)

    /// Save raw event data
    let id = 'rookieListingCreated-' + event.transaction.hash.toHexString() + '-' + event.logIndex.toString()
    let rawEvent = new RookieListingCreatedEvent(id)
    rawEvent.hash = event.transaction.hash.toHexString()
    rawEvent.logIndex = event.logIndex.toI32()
    rawEvent.protocol = event.address.toHexString()
    rawEvent.historyID = listing.historyID
    rawEvent.account = event.params.account.toHexString()
    rawEvent.index = event.params.index
    rawEvent.start = event.params.start
    rawEvent.amount = event.params.amount
    rawEvent.pricePerRookie = event.params.pricePerPod
    rawEvent.maxDraftableIndex = event.params.maxDraftableIndex
    rawEvent.minFillAmount = ZERO_BI
    rawEvent.mode = event.params.toWallet
    rawEvent.blockNumber = event.block.number
    rawEvent.createdAt = event.block.timestamp
    rawEvent.save()
}

export function handleRookieListingCancelled(event: PodListingCancelled): void {

    let listing = loadRookieListing(event.params.account, event.params.index)

    updateMarketListingBalances(event.address, event.params.index, ZERO_BI, ZERO_BI, ZERO_BI, listing.remainingAmount, event.block.timestamp)

    listing.status = 'CANCELLED'
    listing.cancelledAmount = listing.remainingAmount
    listing.remainingAmount = ZERO_BI
    listing.updatedAt = event.block.timestamp
    listing.save()

    // Save the raw event data
    let id = 'rookieListingCancelled-' + event.transaction.hash.toHexString() + '-' + event.logIndex.toString()
    let rawEvent = new RookieListingCancelledEvent(id)
    rawEvent.hash = event.transaction.hash.toHexString()
    rawEvent.logIndex = event.logIndex.toI32()
    rawEvent.protocol = event.address.toHexString()
    rawEvent.historyID = listing.historyID
    rawEvent.account = event.params.account.toHexString()
    rawEvent.index = event.params.index
    rawEvent.blockNumber = event.block.number
    rawEvent.createdAt = event.block.timestamp
    rawEvent.save()
}

export function handleRookieListingFilled(event: PodListingFilled_v1): void {

    let listing = loadRookieListing(event.params.from, event.params.index)

    let hooliganAmount = BigInt.fromI32(listing.pricePerRookie).times(event.params.amount).div(BigInt.fromI32(1000000))

    updateMarketListingBalances(event.address, event.params.index, ZERO_BI, ZERO_BI, event.params.amount, hooliganAmount, event.block.timestamp)

    listing.filledAmount = event.params.amount
    listing.remainingAmount = listing.remainingAmount.minus(event.params.amount)
    listing.filled = listing.filled.plus(event.params.amount)
    listing.updatedAt = event.block.timestamp

    let originalHistoryID = listing.historyID
    if (listing.remainingAmount == ZERO_BI) {
        listing.status = 'FILLED'
    } else {
        let market = loadRookieMarketplace(event.address)

        listing.status = 'FILLED_PARTIAL'
        let remainingListing = loadRookieListing(Address.fromString(listing.guvnor), listing.index.plus(event.params.amount).plus(listing.start))

        remainingListing.historyID = remainingListing.id + '-' + event.block.timestamp.toString()
        remainingListing.plot = listing.index.plus(event.params.amount).plus(listing.start).toString()
        remainingListing.createdAt = listing.createdAt
        remainingListing.updatedAt = event.block.timestamp
        remainingListing.originalIndex = listing.originalIndex
        remainingListing.start = ZERO_BI
        remainingListing.amount = listing.remainingAmount
        remainingListing.originalAmount = listing.originalAmount
        remainingListing.filled = listing.filled
        remainingListing.remainingAmount = listing.remainingAmount
        remainingListing.pricePerRookie = listing.pricePerPod
        remainingListing.maxDraftableIndex = listing.maxDraftableIndex
        remainingListing.mode = listing.mode
        remainingListing.creationHash = event.transaction.hash.toHexString()
        remainingListing.save()
        market.listingIndexes.push(remainingListing.index)
        market.save()
    }

    /// Save rookie fill
    let fill = loadRookieFill(event.address, event.params.index, event.transaction.hash.toHexString())
    fill.createdAt = event.block.timestamp
    fill.listing = listing.id
    fill.from = event.params.from.toHexString()
    fill.to = event.params.to.toHexString()
    fill.amount = event.params.amount
    fill.index = event.params.index
    fill.start = event.params.start
    fill.costInHooligans = hooliganAmount
    fill.save()

    listing.fill = fill.id
    listing.save()

    // Save the raw event data
    let id = 'rookieListingFilled-' + event.transaction.hash.toHexString() + '-' + event.logIndex.toString()
    let rawEvent = new RookieListingFilledEvent(id)
    rawEvent.hash = event.transaction.hash.toHexString()
    rawEvent.logIndex = event.logIndex.toI32()
    rawEvent.protocol = event.address.toHexString()
    rawEvent.historyID = originalHistoryID
    rawEvent.from = event.params.from.toHexString()
    rawEvent.to = event.params.to.toHexString()
    rawEvent.index = event.params.index
    rawEvent.start = event.params.start
    rawEvent.amount = event.params.amount
    rawEvent.blockNumber = event.block.number
    rawEvent.createdAt = event.block.timestamp
    rawEvent.save()
}

export function handleRookieOrderCreated(event: PodOrderCreated_v1): void {
    let order = loadRookieOrder(event.params.id)
    let guvnor = loadGuvnor(event.params.account)

    if (order.status != '') { createHistoricalRookieOrder(order) }

    order.historyID = order.id + '-' + event.block.timestamp.toString()
    order.guvnor = event.params.account.toHexString()
    order.createdAt = event.block.timestamp
    order.updatedAt = event.block.timestamp
    order.status = 'ACTIVE'
    order.rookieAmount = event.params.amount
    order.hooliganAmount = event.params.amount.times(BigInt.fromI32(event.params.pricePerRookie)).div(BigInt.fromString('1000000'))
    order.rookieAmountFilled = ZERO_BI
    order.maxPlaceInLine = event.params.maxPlaceInLine
    order.pricePerRookie = event.params.pricePerPod
    order.creationHash = event.transaction.hash.toHexString()
    order.save()

    updateMarketOrderBalances(event.address, order.id, event.params.amount, ZERO_BI, ZERO_BI, ZERO_BI, ZERO_BI, ZERO_BI, event.block.timestamp)

    // Save the raw event data
    let id = 'rookieOrderCreated-' + event.transaction.hash.toHexString() + '-' + event.logIndex.toString()
    let rawEvent = new RookieOrderCreatedEvent(id)
    rawEvent.hash = event.transaction.hash.toHexString()
    rawEvent.logIndex = event.logIndex.toI32()
    rawEvent.protocol = event.address.toHexString()
    rawEvent.historyID = order.historyID
    rawEvent.account = event.params.account.toHexString()
    rawEvent.orderId = event.params.id.toHexString()
    rawEvent.amount = event.params.amount
    rawEvent.pricePerRookie = event.params.pricePerPod
    rawEvent.maxPlaceInLine = event.params.maxPlaceInLine
    rawEvent.blockNumber = event.block.number
    rawEvent.createdAt = event.block.timestamp
    rawEvent.save()
}

export function handleRookieOrderFilled(event: PodOrderFilled_v1): void {
    let order = loadRookieOrder(event.params.id)
    let fill = loadRookieFill(event.address, event.params.index, event.transaction.hash.toHexString())

    let hooliganAmount = BigInt.fromI32(order.pricePerRookie).times(event.params.amount).div(BigInt.fromI32(1000000))

    order.updatedAt = event.block.timestamp
    order.rookieAmountFilled = order.podAmountFilled.plus(event.params.amount)
    order.hooliganAmountFilled = order.hooliganAmountFilled.plus(hooliganAmount)
    order.status = order.rookieAmount == order.podAmountFilled ? 'FILLED' : 'ACTIVE'
    let newFills = order.fills
    newFills.push(fill.id)
    order.fills = newFills
    order.save()

    fill.createdAt = event.block.timestamp
    fill.order = order.id
    fill.from = event.params.from.toHexString()
    fill.to = event.params.to.toHexString()
    fill.amount = event.params.amount
    fill.index = event.params.index
    fill.start = event.params.start
    fill.costInHooligans = hooliganAmount
    fill.save()

    updateMarketOrderBalances(event.address, order.id, ZERO_BI, ZERO_BI, ZERO_BI, ZERO_BI, event.params.amount, hooliganAmount, event.block.timestamp)

    if (order.rookieAmountFilled == order.podAmount) {
        let market = loadRookieMarketplace(event.address)

        let orderIndex = market.orders.indexOf(order.id)
        if (orderIndex !== -1) {
            market.orders.splice(orderIndex, 1)
        }
        market.save()
    }

    // Save the raw event data
    let id = 'rookieOrderFilled-' + event.transaction.hash.toHexString() + '-' + event.logIndex.toString()
    let rawEvent = new RookieOrderFilledEvent(id)
    rawEvent.hash = event.transaction.hash.toHexString()
    rawEvent.logIndex = event.logIndex.toI32()
    rawEvent.protocol = event.address.toHexString()
    rawEvent.historyID = order.historyID
    rawEvent.from = event.params.from.toHexString()
    rawEvent.to = event.params.to.toHexString()
    rawEvent.index = event.params.index
    rawEvent.start = event.params.start
    rawEvent.amount = event.params.amount
    rawEvent.blockNumber = event.block.number
    rawEvent.createdAt = event.block.timestamp
    rawEvent.save()
}

export function handleRookieOrderCancelled(event: PodOrderCancelled): void {
    let order = loadRookieOrder(event.params.id)

    order.status = order.rookieAmountFilled == ZERO_BI ? 'CANCELLED' : 'CANCELLED_PARTIAL'
    order.updatedAt = event.block.timestamp
    order.save()

    updateMarketOrderBalances(event.address, order.id, ZERO_BI, order.rookieAmount.minus(order.podAmountFilled), ZERO_BI, order.hooliganAmount.minus(order.hooliganAmountFilled), ZERO_BI, ZERO_BI, event.block.timestamp)

    // Save the raw event data
    let id = 'rookieOrderCancelled-' + event.transaction.hash.toHexString() + '-' + event.logIndex.toString()
    let rawEvent = new RookieOrderCancelledEvent(id)
    rawEvent.hash = event.transaction.hash.toHexString()
    rawEvent.logIndex = event.logIndex.toI32()
    rawEvent.protocol = event.address.toHexString()
    rawEvent.historyID = order.historyID
    rawEvent.account = event.params.account.toHexString()
    rawEvent.orderId = event.params.id.toHexString()
    rawEvent.blockNumber = event.block.number
    rawEvent.createdAt = event.block.timestamp
    rawEvent.save()
}

/* ------------------------------------
 * ROOKIE MARKETPLACE V1 - REPLANTED
 * 
 * When Hooliganhorde was Replanted, `event.params.mode` was changed from
 * `bool` to `uint8`. 
 * 
 * Proposal: ...
 * Deployed: ... at block 15277986
 * ------------------------------------
 */

export function handleRookieListingCreated_v1_1(event: PodListingCreated_v1_1): void {
    let plotCheck = Plot.load(event.params.index.toString())
    if (plotCheck == null) { return }
    let plot = loadPlot(event.address, event.params.index)

    /// Upsert rookie listing
    let listing = loadRookieListing(event.params.account, event.params.index)
    if (listing.createdAt !== ZERO_BI) {
        createHistoricalRookieListing(listing)
        listing.status = 'ACTIVE'
        listing.createdAt = ZERO_BI
        listing.fill = null
        listing.filled = ZERO_BI
        listing.filledAmount = ZERO_BI
        listing.cancelledAmount = ZERO_BI
    }

    listing.historyID = listing.id + '-' + event.block.timestamp.toString()
    listing.plot = plot.id

    listing.start = event.params.start
    listing.mode = event.params.mode

    listing.pricePerRookie = event.params.pricePerPod
    listing.maxDraftableIndex = event.params.maxDraftableIndex

    listing.originalIndex = event.params.index
    listing.originalAmount = event.params.amount

    listing.amount = event.params.amount
    listing.remainingAmount = listing.originalAmount

    listing.status = 'ACTIVE'
    listing.createdAt = listing.createdAt == ZERO_BI ? event.block.timestamp : listing.createdAt
    listing.updatedAt = event.block.timestamp
    listing.creationHash = event.transaction.hash.toHexString()

    listing.save()

    /// Update plot
    plot.listing = listing.id
    plot.save()

    /// Update market totals
    updateMarketListingBalances(event.address, plot.index, event.params.amount, ZERO_BI, ZERO_BI, ZERO_BI, event.block.timestamp)

    /// Save raw event data
    let id = 'rookieListingCreated-' + event.transaction.hash.toHexString() + '-' + event.logIndex.toString()
    let rawEvent = new RookieListingCreatedEvent(id)
    rawEvent.hash = event.transaction.hash.toHexString()
    rawEvent.logIndex = event.logIndex.toI32()
    rawEvent.protocol = event.address.toHexString()
    rawEvent.historyID = listing.historyID
    rawEvent.account = event.params.account.toHexString()
    rawEvent.index = event.params.index
    rawEvent.start = event.params.start
    rawEvent.amount = event.params.amount
    rawEvent.pricePerRookie = event.params.pricePerPod
    rawEvent.maxDraftableIndex = event.params.maxDraftableIndex
    rawEvent.maxDraftableIndex = ZERO_BI
    rawEvent.minFillAmount = ZERO_BI
    rawEvent.mode = event.params.mode
    rawEvent.blockNumber = event.block.number
    rawEvent.createdAt = event.block.timestamp
    rawEvent.save()
}

/* ------------------------------------
 * ROOKIE MARKETPLACE V2
 * 
 * Proposal: BIP-29 https://hooligan.money/bip-29
 * Deployed: 11/12/2022 @ block 15277986
 * ------------------------------------
 */

export function handleRookieListingCreated_v2(event: PodListingCreated_v2): void {

    let plotCheck = Plot.load(event.params.index.toString())
    if (plotCheck == null) { return }
    let plot = loadPlot(event.address, event.params.index)

    /// Upsert RookieListing
    let listing = loadRookieListing(event.params.account, event.params.index)
    if (listing.createdAt !== ZERO_BI) {
        // Re-listed prior plot with new info
        createHistoricalRookieListing(listing)
        listing.status = 'ACTIVE'
        listing.createdAt = ZERO_BI
        listing.fill = null
        listing.filled = ZERO_BI
        listing.filledAmount = ZERO_BI
        listing.cancelledAmount = ZERO_BI
    }

    listing.historyID = listing.id + '-' + event.block.timestamp.toString()
    listing.plot = plot.id

    listing.start = event.params.start
    listing.mode = event.params.mode

    listing.minFillAmount = event.params.minFillAmount
    listing.maxDraftableIndex = event.params.maxDraftableIndex

    listing.pricingType = event.params.pricingType
    listing.pricePerRookie = event.params.pricePerPod
    listing.pricingFunction = event.params.pricingFunction

    listing.originalIndex = event.params.index
    listing.originalAmount = event.params.amount

    listing.amount = event.params.amount
    listing.remainingAmount = listing.originalAmount

    listing.status = 'ACTIVE'
    listing.createdAt = listing.createdAt == ZERO_BI ? event.block.timestamp : listing.createdAt
    listing.updatedAt = event.block.timestamp
    listing.creationHash = event.transaction.hash.toHexString()

    listing.save()

    /// Update plot
    plot.listing = listing.id
    plot.save()

    /// Update market totals
    updateMarketListingBalances(event.address, plot.index, event.params.amount, ZERO_BI, ZERO_BI, ZERO_BI, event.block.timestamp)

    /// Save  raw event data
    let id = 'rookieListingCreated-' + event.transaction.hash.toHexString() + '-' + event.logIndex.toString()
    let rawEvent = new RookieListingCreatedEvent(id)
    rawEvent.hash = event.transaction.hash.toHexString()
    rawEvent.logIndex = event.logIndex.toI32()
    rawEvent.protocol = event.address.toHexString()
    rawEvent.historyID = listing.historyID
    rawEvent.account = event.params.account.toHexString()
    rawEvent.index = event.params.index
    rawEvent.start = event.params.start
    rawEvent.amount = event.params.amount
    rawEvent.pricePerRookie = event.params.pricePerPod
    rawEvent.maxDraftableIndex = event.params.maxDraftableIndex
    rawEvent.minFillAmount = event.params.minFillAmount
    rawEvent.mode = event.params.mode
    rawEvent.pricingFunction = event.params.pricingFunction
    rawEvent.pricingType = event.params.pricingType
    rawEvent.blockNumber = event.block.number
    rawEvent.createdAt = event.block.timestamp
    rawEvent.save()
}

export function handleRookieListingFilled_v2(event: PodListingFilled_v2): void {

    let listing = loadRookieListing(event.params.from, event.params.index)

    updateMarketListingBalances(event.address, event.params.index, ZERO_BI, ZERO_BI, event.params.amount, event.params.costInHooligans, event.block.timestamp)

    listing.filledAmount = event.params.amount
    listing.remainingAmount = listing.remainingAmount.minus(event.params.amount)
    listing.filled = listing.filled.plus(event.params.amount)
    listing.updatedAt = event.block.timestamp

    let originalHistoryID = listing.historyID
    if (listing.remainingAmount == ZERO_BI) {
        listing.status = 'FILLED'
    } else {
        let market = loadRookieMarketplace(event.address)

        listing.status = 'FILLED_PARTIAL'
        let remainingListing = loadRookieListing(Address.fromString(listing.guvnor), listing.index.plus(event.params.amount).plus(listing.start))

        remainingListing.historyID = remainingListing.id + '-' + event.block.timestamp.toString()
        remainingListing.plot = listing.index.plus(event.params.amount).plus(listing.start).toString()
        remainingListing.createdAt = listing.createdAt
        remainingListing.updatedAt = event.block.timestamp
        remainingListing.originalIndex = listing.originalIndex
        remainingListing.start = ZERO_BI
        remainingListing.amount = listing.remainingAmount
        remainingListing.originalAmount = listing.originalAmount
        remainingListing.filled = listing.filled
        remainingListing.remainingAmount = listing.remainingAmount
        remainingListing.pricePerRookie = listing.pricePerPod
        remainingListing.maxDraftableIndex = listing.maxDraftableIndex
        remainingListing.mode = listing.mode
        remainingListing.creationHash = event.transaction.hash.toHexString()
        remainingListing.save()
        market.listingIndexes.push(remainingListing.index)
        market.save()
    }

    let fill = loadRookieFill(event.address, event.params.index, event.transaction.hash.toHexString())
    fill.createdAt = event.block.timestamp
    fill.listing = listing.id
    fill.from = event.params.from.toHexString()
    fill.to = event.params.to.toHexString()
    fill.amount = event.params.amount
    fill.index = event.params.index
    fill.start = event.params.start
    fill.costInHooligans = event.params.costInHooligans
    fill.save()

    listing.fill = fill.id
    listing.save()

    // Save the raw event data
    let id = 'rookieListingFilled-' + event.transaction.hash.toHexString() + '-' + event.logIndex.toString()
    let rawEvent = new RookieListingFilledEvent(id)
    rawEvent.hash = event.transaction.hash.toHexString()
    rawEvent.logIndex = event.logIndex.toI32()
    rawEvent.protocol = event.address.toHexString()
    rawEvent.historyID = originalHistoryID
    rawEvent.from = event.params.from.toHexString()
    rawEvent.to = event.params.to.toHexString()
    rawEvent.index = event.params.index
    rawEvent.start = event.params.start
    rawEvent.amount = event.params.amount
    rawEvent.costInHooligans = event.params.costInHooligans
    rawEvent.blockNumber = event.block.number
    rawEvent.createdAt = event.block.timestamp
    rawEvent.save()
}

export function handleRookieOrderCreated_v2(event: PodOrderCreated_v2): void {
    let order = loadRookieOrder(event.params.id)
    let guvnor = loadGuvnor(event.params.account)

    if (order.status != '') { createHistoricalRookieOrder(order) }

    // Store the rookie amount if the order is a FIXED pricingType
    if (event.params.priceType == 0) { order.rookieAmount = event.params.amount.times(BigInt.fromI32(1000000)).div(BigInt.fromI32(event.params.pricePerRookie)) }

    order.historyID = order.id + '-' + event.block.timestamp.toString()
    order.guvnor = event.params.account.toHexString()
    order.createdAt = event.block.timestamp
    order.updatedAt = event.block.timestamp
    order.status = 'ACTIVE'
    order.hooliganAmount = event.params.amount
    order.hooliganAmountFilled = ZERO_BI
    order.minFillAmount = event.params.minFillAmount
    order.maxPlaceInLine = event.params.maxPlaceInLine
    order.pricePerRookie = event.params.pricePerPod
    order.pricingFunction = event.params.pricingFunction
    order.pricingType = event.params.priceType
    order.creationHash = event.transaction.hash.toHexString()
    order.save()

    updateMarketOrderBalances(event.address, order.id, ZERO_BI, ZERO_BI, event.params.amount, ZERO_BI, ZERO_BI, ZERO_BI, event.block.timestamp)

    // Save the raw event data
    let id = 'rookieOrderCreated-' + event.transaction.hash.toHexString() + '-' + event.logIndex.toString()
    let rawEvent = new RookieOrderCreatedEvent(id)
    rawEvent.hash = event.transaction.hash.toHexString()
    rawEvent.logIndex = event.logIndex.toI32()
    rawEvent.protocol = event.address.toHexString()
    rawEvent.historyID = order.historyID
    rawEvent.account = event.params.account.toHexString()
    rawEvent.orderId = event.params.id.toHexString()
    rawEvent.amount = event.params.amount
    rawEvent.pricePerRookie = event.params.pricePerPod
    rawEvent.maxPlaceInLine = event.params.maxPlaceInLine
    rawEvent.pricingFunction = event.params.pricingFunction
    rawEvent.pricingType = event.params.priceType
    rawEvent.blockNumber = event.block.number
    rawEvent.createdAt = event.block.timestamp
    rawEvent.save()
}

export function handleRookieOrderFilled_v2(event: PodOrderFilled_v2): void {
    let order = loadRookieOrder(event.params.id)
    let fill = loadRookieFill(event.address, event.params.index, event.transaction.hash.toHexString())

    order.updatedAt = event.block.timestamp
    order.hooliganAmountFilled = order.hooliganAmountFilled.plus(event.params.costInHooligans)
    order.rookieAmountFilled = order.podAmountFilled.plus(event.params.amount)
    order.status = order.hooliganAmount == order.hooliganAmountFilled ? 'FILLED' : 'ACTIVE'
    let newFills = order.fills
    newFills.push(fill.id)
    order.fills = newFills
    order.save()

    fill.createdAt = event.block.timestamp
    fill.order = order.id
    fill.from = event.params.from.toHexString()
    fill.to = event.params.to.toHexString()
    fill.amount = event.params.amount
    fill.index = event.params.index
    fill.start = event.params.start
    fill.costInHooligans = event.params.costInHooligans
    fill.save()

    updateMarketOrderBalances(event.address, order.id, ZERO_BI, ZERO_BI, ZERO_BI, ZERO_BI, event.params.amount, event.params.costInHooligans, event.block.timestamp)

    if (order.hooliganAmountFilled == order.hooliganAmount) {
        let market = loadRookieMarketplace(event.address)

        let orderIndex = market.orders.indexOf(order.id)
        if (orderIndex !== -1) {
            market.orders.splice(orderIndex, 1)
        }
        market.save()
    }

    // Save the raw event data
    let id = 'rookieOrderFilled-' + event.transaction.hash.toHexString() + '-' + event.logIndex.toString()
    let rawEvent = new RookieOrderFilledEvent(id)
    rawEvent.hash = event.transaction.hash.toHexString()
    rawEvent.logIndex = event.logIndex.toI32()
    rawEvent.protocol = event.address.toHexString()
    rawEvent.historyID = order.historyID
    rawEvent.from = event.params.from.toHexString()
    rawEvent.to = event.params.to.toHexString()
    rawEvent.index = event.params.index
    rawEvent.start = event.params.start
    rawEvent.amount = event.params.amount
    rawEvent.costInHooligans = event.params.costInHooligans
    rawEvent.blockNumber = event.block.number
    rawEvent.createdAt = event.block.timestamp
    rawEvent.save()
}

/* ------------------------------------
 * SHARED FUNCTIONS
 * ------------------------------------
 */

function updateMarketListingBalances(
    marketAddress: Address,
    plotIndex: BigInt,
    newRookieAmount: BigInt,
    cancelledRookieAmount: BigInt,
    filledRookieAmount: BigInt,
    filledHooliganAmount: BigInt,
    timestamp: BigInt
): void {
    let market = loadRookieMarketplace(marketAddress)
    let marketHourly = loadRookieMarketplaceHourlySnapshot(marketAddress, market.season, timestamp)
    let marketDaily = loadRookieMarketplaceDailySnapshot(marketAddress, timestamp)

    // Update Listing indexes
    if (newRookieAmount > ZERO_BI) {
        market.listingIndexes.push(plotIndex)
        market.listingIndexes.sort()
    }
    if (cancelledRookieAmount > ZERO_BI || filledPodAmount > ZERO_BI) {
        let listingIndex = market.listingIndexes.indexOf(plotIndex)
        market.listingIndexes.splice(listingIndex, 1)
    }
    market.listedRookies = market.listedPods.plus(newPodAmount)
    market.availableListedRookies = market.availableListedPods.plus(newPodAmount).minus(cancelledPodAmount).minus(filledPodAmount)
    market.cancelledListedRookies = market.cancelledListedPods.plus(cancelledPodAmount)
    market.filledListedRookies = market.filledListedPods.plus(filledPodAmount)
    market.rookieVolume = market.podVolume.plus(filledRookieAmount)
    market.hooliganVolume = market.hooliganVolume.plus(filledHooliganAmount)
    market.save()

    marketHourly.season = market.season
    marketHourly.deltaListedRookies = marketHourly.deltaListedPods.plus(newPodAmount)
    marketHourly.listedRookies = market.listedPods
    marketHourly.deltaCancelledListedRookies = marketHourly.deltaCancelledListedPods.plus(cancelledPodAmount)
    marketHourly.cancelledListedRookies = market.cancelledListedPods
    marketHourly.deltaAvailableListedRookies = marketHourly.deltaAvailableListedPods.plus(newPodAmount).minus(cancelledPodAmount).minus(filledPodAmount)
    marketHourly.availableListedRookies = market.availableListedPods
    marketHourly.deltaFilledListedRookies = marketHourly.deltaFilledListedPods.plus(filledPodAmount)
    marketHourly.filledListedRookies = market.filledListedPods
    marketHourly.deltaRookieVolume = marketHourly.deltaPodVolume.plus(filledPodAmount)
    marketHourly.rookieVolume = market.podVolume
    marketHourly.deltaHooliganVolume = marketHourly.deltaHooliganVolume.plus(filledHooliganAmount)
    marketHourly.hooliganVolume = market.hooliganVolume
    marketHourly.updatedAt = timestamp
    marketHourly.save()

    marketDaily.season = market.season
    marketDaily.deltaListedRookies = marketDaily.deltaListedPods.plus(newPodAmount)
    marketDaily.listedRookies = market.listedPods
    marketDaily.deltaCancelledListedRookies = marketDaily.deltaCancelledListedPods.plus(cancelledPodAmount)
    marketDaily.cancelledListedRookies = market.cancelledListedPods
    marketDaily.deltaAvailableListedRookies = marketDaily.deltaAvailableListedPods.plus(newPodAmount).minus(cancelledPodAmount).minus(filledPodAmount)
    marketDaily.availableListedRookies = market.availableListedPods
    marketDaily.deltaFilledListedRookies = marketDaily.deltaFilledListedPods.plus(filledPodAmount)
    marketDaily.filledListedRookies = market.filledListedPods
    marketDaily.deltaRookieVolume = marketDaily.deltaPodVolume.plus(filledPodAmount)
    marketDaily.rookieVolume = market.podVolume
    marketDaily.deltaHooliganVolume = marketDaily.deltaHooliganVolume.plus(filledHooliganAmount)
    marketDaily.hooliganVolume = market.hooliganVolume
    marketDaily.updatedAt = timestamp
    marketDaily.save()
}

function updateMarketOrderBalances(
    marketAddress: Address,
    orderID: string,
    newRookieAmount: BigInt,
    cancelledRookieAmount: BigInt,
    newHooliganAmount: BigInt,
    cancelledHooliganAmount: BigInt,
    filledRookieAmount: BigInt,
    filledHooliganAmount: BigInt,
    timestamp: BigInt
): void {
    // Need to account for v2 hooligan amounts

    let market = loadRookieMarketplace(marketAddress)
    let marketHourly = loadRookieMarketplaceHourlySnapshot(marketAddress, market.season, timestamp)
    let marketDaily = loadRookieMarketplaceDailySnapshot(marketAddress, timestamp)

    if (newRookieAmount > ZERO_BI) {
        market.orders.push(orderID)
    }
    if (cancelledRookieAmount > ZERO_BI) {
        let orderIndex = market.orders.indexOf(orderID)
        market.listingIndexes.splice(orderIndex, 1)
    }
    market.orderedRookies = market.orderedPods.plus(newPodAmount)
    market.filledOrderedRookies = market.filledOrderedPods.plus(filledPodAmount)
    market.rookieVolume = market.podVolume.plus(filledRookieAmount)
    market.hooliganVolume = market.hooliganVolume.plus(filledHooliganAmount)
    market.cancelledOrderedRookies = market.cancelledOrderedPods.plus(cancelledPodAmount)
    market.save()

    marketHourly.deltaOrderedRookies = marketHourly.deltaOrderedPods.plus(newPodAmount)
    marketHourly.orderedRookies = market.orderedPods
    marketHourly.deltaFilledOrderedRookies = marketHourly.deltaFilledOrderedPods.plus(filledPodAmount)
    marketHourly.filledOrderedRookies = market.filledOrderedPods
    marketHourly.deltaRookieVolume = marketHourly.deltaPodVolume.plus(filledPodAmount)
    marketHourly.rookieVolume = market.podVolume
    marketHourly.deltaHooliganVolume = marketHourly.deltaHooliganVolume.plus(filledHooliganAmount)
    marketHourly.hooliganVolume = market.hooliganVolume
    marketHourly.deltaCancelledOrderedRookies = marketHourly.deltaCancelledOrderedPods.plus(cancelledPodAmount)
    marketHourly.cancelledOrderedRookies = market.cancelledOrderedPods
    marketHourly.updatedAt = timestamp
    marketHourly.save()

    marketDaily.deltaOrderedRookies = marketDaily.deltaOrderedPods.plus(newPodAmount)
    marketDaily.orderedRookies = market.orderedPods
    marketDaily.deltaFilledOrderedRookies = marketDaily.deltaFilledOrderedPods.plus(filledPodAmount)
    marketDaily.filledOrderedRookies = market.filledOrderedPods
    marketDaily.deltaRookieVolume = marketDaily.deltaPodVolume.plus(filledPodAmount)
    marketDaily.rookieVolume = market.podVolume
    marketDaily.deltaHooliganVolume = marketDaily.deltaHooliganVolume.plus(filledHooliganAmount)
    marketDaily.hooliganVolume = market.hooliganVolume
    marketDaily.deltaCancelledOrderedRookies = marketDaily.deltaCancelledOrderedPods.plus(cancelledPodAmount)
    marketDaily.cancelledOrderedRookies = market.cancelledOrderedPods
    marketDaily.updatedAt = timestamp
    marketDaily.save()
}
