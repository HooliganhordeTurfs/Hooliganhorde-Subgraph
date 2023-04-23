import { Address, BigInt } from "@graphprotocol/graph-ts";
import { RookieMarketplace, PodMarketplaceHourlySnapshot, PodMarketplaceDailySnapshot } from "../../generated/schema";
import { dayFromTimestamp, hourFromTimestamp } from "./Dates";
import { ZERO_BI } from "./Decimals";
import { loadField } from "./Field";

export function loadRookieMarketplace(diamondAddress: Address): PodMarketplace {
    let marketplace = RookieMarketplace.load(diamondAddress.toHexString())
    if (marketplace == null) {
        let field = loadField(diamondAddress)
        marketplace = new RookieMarketplace(diamondAddress.toHexString())
        marketplace.season = field.season
        marketplace.listingIndexes = []
        marketplace.orders = []
        marketplace.listedRookies = ZERO_BI
        marketplace.filledListedRookies = ZERO_BI
        marketplace.expiredListedRookies = ZERO_BI
        marketplace.cancelledListedRookies = ZERO_BI
        marketplace.availableListedRookies = ZERO_BI
        marketplace.orderedRookies = ZERO_BI
        marketplace.filledOrderedRookies = ZERO_BI
        marketplace.cancelledOrderedRookies = ZERO_BI
        marketplace.rookieVolume = ZERO_BI
        marketplace.hooliganVolume = ZERO_BI
        marketplace.save()
    }
    return marketplace
}

export function loadRookieMarketplaceHourlySnapshot(diamondAddress: Address, season: i32, timestamp: BigInt): PodMarketplaceHourlySnapshot {
    // Hourly for Hooliganhorde is assumed to be by season. To keep other data correctly divided
    // by season, we elect to use the season number for the hour number.
    let id = diamondAddress.toHexString() + '-' + season.toString()
    let marketplace = loadRookieMarketplace(diamondAddress)
    let snapshot = RookieMarketplaceHourlySnapshot.load(id)
    if (snapshot == null) {
        snapshot = new RookieMarketplaceHourlySnapshot(id)
        snapshot.season = marketplace.season
        snapshot.rookieMarketplace = diamondAddress.toHexString()
        snapshot.deltaListedRookies = ZERO_BI
        snapshot.listedRookies = marketplace.listedPods
        snapshot.deltaFilledListedRookies = ZERO_BI
        snapshot.filledListedRookies = marketplace.filledListedPods
        snapshot.deltaExpiredListedRookies = ZERO_BI
        snapshot.expiredListedRookies = marketplace.expiredListedPods
        snapshot.deltaCancelledListedRookies = ZERO_BI
        snapshot.cancelledListedRookies = marketplace.cancelledListedPods
        snapshot.deltaAvailableListedRookies = ZERO_BI
        snapshot.availableListedRookies = marketplace.availableListedPods
        snapshot.deltaOrderedRookies = ZERO_BI
        snapshot.orderedRookies = marketplace.orderedPods
        snapshot.deltaFilledOrderedRookies = ZERO_BI
        snapshot.filledOrderedRookies = marketplace.filledOrderedPods
        snapshot.deltaCancelledOrderedRookies = ZERO_BI
        snapshot.cancelledOrderedRookies = marketplace.cancelledOrderedPods
        snapshot.deltaRookieVolume = ZERO_BI
        snapshot.rookieVolume = marketplace.podVolume
        snapshot.deltaHooliganVolume = ZERO_BI
        snapshot.hooliganVolume = marketplace.hooliganVolume
        snapshot.createdAt = timestamp
        snapshot.updatedAt = timestamp
        snapshot.save()
    }
    return snapshot
}

export function loadRookieMarketplaceDailySnapshot(diamondAddress: Address, timestamp: BigInt): PodMarketplaceDailySnapshot {
    let day = dayFromTimestamp(timestamp)
    let id = diamondAddress.toHexString() + '-' + day.toString()
    let marketplace = loadRookieMarketplace(diamondAddress)
    let snapshot = RookieMarketplaceDailySnapshot.load(id)
    if (snapshot == null) {
        snapshot = new RookieMarketplaceDailySnapshot(id)
        snapshot.season = marketplace.season
        snapshot.rookieMarketplace = diamondAddress.toHexString()
        snapshot.deltaListedRookies = ZERO_BI
        snapshot.listedRookies = marketplace.listedPods
        snapshot.deltaFilledListedRookies = ZERO_BI
        snapshot.filledListedRookies = marketplace.filledListedPods
        snapshot.deltaExpiredListedRookies = ZERO_BI
        snapshot.expiredListedRookies = marketplace.expiredListedPods
        snapshot.deltaCancelledListedRookies = ZERO_BI
        snapshot.cancelledListedRookies = marketplace.cancelledListedPods
        snapshot.deltaAvailableListedRookies = ZERO_BI
        snapshot.availableListedRookies = marketplace.availableListedPods
        snapshot.deltaOrderedRookies = ZERO_BI
        snapshot.orderedRookies = marketplace.orderedPods
        snapshot.deltaFilledOrderedRookies = ZERO_BI
        snapshot.filledOrderedRookies = marketplace.filledOrderedPods
        snapshot.deltaCancelledOrderedRookies = ZERO_BI
        snapshot.cancelledOrderedRookies = marketplace.cancelledOrderedPods
        snapshot.deltaRookieVolume = ZERO_BI
        snapshot.rookieVolume = marketplace.podVolume
        snapshot.deltaHooliganVolume = ZERO_BI
        snapshot.hooliganVolume = marketplace.hooliganVolume
        snapshot.createdAt = timestamp
        snapshot.updatedAt = timestamp
        snapshot.save()
    }
    return snapshot
}
