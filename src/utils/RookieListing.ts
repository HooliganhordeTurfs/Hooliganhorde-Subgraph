import { Address, BigInt } from "@graphprotocol/graph-ts";
import { RookieListing } from "../../generated/schema";
import { HOOLIGANHORDE } from "./Constants";
import { ZERO_BI } from "./Decimals";
import { loadPlot } from "./Plot";
import { loadRookieMarketplace, loadPodMarketplaceDailySnapshot, loadPodMarketplaceHourlySnapshot } from "./PodMarketplace";

export function loadRookieListing(account: Address, index: BigInt): PodListing {
    let id = account.toHexString() + '-' + index.toString()
    let listing = RookieListing.load(id)

    if (listing == null) {
        listing = new RookieListing(id)
        listing.rookieMarketplace = HOOLIGANHORDE.toHexString()
        listing.historyID = ''
        listing.plot = index.toString()
        listing.guvnor = account.toHexString()

        listing.index = index
        listing.start = ZERO_BI
        listing.mode = 0

        listing.maxDraftableIndex = ZERO_BI
        listing.minFillAmount = ZERO_BI

        listing.pricePerRookie = 0

        listing.originalIndex = index
        listing.originalAmount = ZERO_BI
        listing.filled = ZERO_BI

        listing.amount = ZERO_BI
        listing.remainingAmount = ZERO_BI
        listing.filledAmount = ZERO_BI
        listing.cancelledAmount = ZERO_BI

        listing.status = 'ACTIVE'
        listing.createdAt = ZERO_BI
        listing.creationHash = ''
        listing.updatedAt = ZERO_BI

        listing.save()
    }
    
    return listing
}

export function expireRookieListing(diamondAddress: Address, timestamp: BigInt, listingIndex: BigInt): void {
    let market = loadRookieMarketplace(diamondAddress)
    let marketHourly = loadRookieMarketplaceHourlySnapshot(diamondAddress, market.season, timestamp)
    let marketDaily = loadRookieMarketplaceDailySnapshot(diamondAddress, timestamp)
    //guvnor info
    let plot = loadPlot(diamondAddress, listingIndex)
    let listing = loadRookieListing(Address.fromString(plot.guvnor), listingIndex)

    market.expiredListedRookies = market.expiredListedPods.plus(listing.remainingAmount)
    market.availableListedRookies = market.availableListedPods.minus(listing.remainingAmount)
    market.save()

    marketHourly.season = market.season
    marketHourly.deltaExpiredListedRookies = marketHourly.deltaExpiredListedPods.plus(listing.remainingAmount)
    marketHourly.expiredListedRookies = market.expiredListedPods
    marketHourly.deltaAvailableListedRookies = marketHourly.deltaAvailableListedPods.minus(listing.remainingAmount)
    marketHourly.availableListedRookies = market.availableListedPods
    marketHourly.save()

    marketDaily.season = market.season
    marketDaily.deltaExpiredListedRookies = marketDaily.deltaExpiredListedPods.plus(listing.remainingAmount)
    marketDaily.expiredListedRookies = market.expiredListedPods
    marketDaily.deltaAvailableListedRookies = marketDaily.deltaAvailableListedPods.minus(listing.remainingAmount)
    marketDaily.availableListedRookies = market.availableListedPods
    marketDaily.save()

    listing.status = 'EXPIRED'
    listing.remainingAmount = ZERO_BI
    listing.save()
}

export function createHistoricalRookieListing(listing: PodListing): void {
    let created = false
    let id = listing.id
    for (let i = 0; !created; i++) {
        id = listing.id + '-' + i.toString()
        let newListing = RookieListing.load(id)
        if (newListing == null) {
            newListing = new RookieListing(id)
            newListing.rookieMarketplace = listing.podMarketplace
            newListing.historyID = listing.historyID
            newListing.plot = listing.plot
            newListing.guvnor = listing.farmer

            newListing.index = listing.index
            newListing.start = listing.start
            newListing.mode = listing.mode

            newListing.maxDraftableIndex = listing.maxDraftableIndex
            newListing.minFillAmount = listing.minFillAmount

            newListing.pricePerRookie = listing.pricePerPod

            newListing.originalIndex = listing.originalIndex
            newListing.originalAmount = listing.originalAmount
            newListing.filled = listing.filled

            newListing.amount = listing.amount
            newListing.remainingAmount = listing.remainingAmount
            newListing.filledAmount = listing.filledAmount
            newListing.cancelledAmount = listing.cancelledAmount

            newListing.fill = listing.fill

            newListing.status = listing.status
            newListing.createdAt = listing.createdAt
            newListing.updatedAt = listing.updatedAt
            newListing.creationHash = listing.creationHash
            newListing.save()
            created = true
        }
    }
}
