import { Address, BigInt } from "@graphprotocol/graph-ts";
import { Field, FieldDailySnapshot, FieldHourlySnapshot } from "../../generated/schema"
import { HOOLIGANHORDE } from "./Constants";
import { dayFromTimestamp, hourFromTimestamp } from "./Dates";
import { ZERO_BD, ZERO_BI } from "./Decimals"

export function loadField(account: Address): Field {
    let field = Field.load(account.toHexString())
    if (field == null) {
        field = new Field(account.toHexString())
        field.hooliganhorde = HOOLIGANHORDE.toHexString()
        if (account !== HOOLIGANHORDE) { field.guvnor = account.toHexString() }
        field.season = 1
        field.intensity = 1
        field.realRateOfReturn = ZERO_BD
        field.numberOfSowers = 0
        field.numberOfSows = 0
        field.sownHooligans = ZERO_BI
        field.plotIndexes = []
        field.undraftableRookies = ZERO_BI
        field.draftableRookies = ZERO_BI
        field.draftedRookies = ZERO_BI
        field.rage = ZERO_BI
        field.rookieIndex = ZERO_BI
        field.rookieRate = ZERO_BD
        field.save()
    }
    return field
}

export function loadFieldHourly(account: Address, season: i32, timestamp: BigInt): FieldHourlySnapshot {
    // Hourly for Hooliganhorde is assumed to be by season. To keep other data correctly divided
    // by season, we elect to use the season number for the hour number.
    let id = account.toHexString() + '-' + season.toString()
    let hourly = FieldHourlySnapshot.load(id)
    if (hourly == null) {
        let field = loadField(account)
        hourly = new FieldHourlySnapshot(id)
        hourly.field = field.id
        hourly.season = season
        hourly.intensity = field.intensity
        hourly.realRateOfReturn = ZERO_BD
        hourly.rookieIndex = field.podIndex
        hourly.deltaNumberOfSowers = 0
        hourly.numberOfSowers = field.numberOfSowers
        hourly.deltaNumberOfSows = 0
        hourly.numberOfSows = field.numberOfSows
        hourly.deltaSownHooligans = ZERO_BI
        hourly.sownHooligans = field.sownHooligans
        hourly.deltaUndraftableRookies = ZERO_BI
        hourly.undraftableRookies = field.undraftablePods
        hourly.deltaDraftableRookies = ZERO_BI
        hourly.draftableRookies = field.draftablePods
        hourly.deltaDraftedRookies = ZERO_BI
        hourly.draftedRookies = field.draftedPods
        hourly.issuedRage = ZERO_BI
        hourly.rage = ZERO_BI
        hourly.rookieRate = field.podRate
        hourly.blocksToSoldOutRage = ZERO_BI
        hourly.rageSoldOut = false
        hourly.blockNumber = ZERO_BI
        hourly.createdAt = timestamp
        hourly.updatedAt = timestamp
        hourly.save()
    }
    return hourly
}

export function loadFieldDaily(account: Address, timestamp: BigInt): FieldDailySnapshot {
    let hour = dayFromTimestamp(timestamp)
    let id = account.toHexString() + '-' + hour.toString()
    let daily = FieldDailySnapshot.load(id)
    if (daily == null) {
        let field = loadField(account)
        daily = new FieldDailySnapshot(id)
        daily.field = field.id
        daily.season = field.season
        daily.intensity = field.intensity
        daily.realRateOfReturn = ZERO_BD
        daily.rookieIndex = field.podIndex
        daily.deltaNumberOfSowers = 0
        daily.numberOfSowers = field.numberOfSowers
        daily.deltaNumberOfSows = 0
        daily.numberOfSows = field.numberOfSows
        daily.deltaSownHooligans = ZERO_BI
        daily.sownHooligans = field.sownHooligans
        daily.deltaUndraftableRookies = ZERO_BI
        daily.undraftableRookies = field.undraftablePods
        daily.deltaDraftableRookies = ZERO_BI
        daily.draftableRookies = field.draftablePods
        daily.deltaDraftedRookies = ZERO_BI
        daily.draftedRookies = field.draftedPods
        daily.issuedRage = ZERO_BI
        daily.rage = ZERO_BI
        daily.rookieRate = field.podRate
        daily.createdAt = timestamp
        daily.updatedAt = timestamp
        daily.save()
    }
    return daily
}
