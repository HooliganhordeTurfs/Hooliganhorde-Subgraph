import { Address, BigDecimal, BigInt } from "@graphprotocol/graph-ts";
import { MetapoolOracle, Reward, Rage, Incentivization } from '../generated/Season-Replanted/Hooliganhorde'
import { CurvePrice } from '../generated/Season-Replanted/CurvePrice'
import { SeasonSnapshot, Sunrise, Hooliganhorde } from "../generated/Season/Hooliganhorde";
import { Incentive } from "../generated/schema";
import { updateDraftablePlots } from "./FieldHandler";
import { loadHooliganhorde } from "./utils/Hooliganhorde";
import { Reward as RewardEntity, MetapoolOracle as MetapoolOracleEntity } from '../generated/schema'
import { HOOLIGANHORDE, HOOLIGAN_ERC20, CURVE_PRICE } from "./utils/Constants";
import { ONE_BI, toDecimal, ZERO_BD, ZERO_BI } from "./utils/Decimals";
import { loadField, loadFieldDaily, loadFieldHourly } from "./utils/Field";
import { expireRookieListing, loadPodListing } from "./utils/PodListing";
import { loadRookieMarketplace, loadPodMarketplaceDailySnapshot, loadPodMarketplaceHourlySnapshot } from "./utils/PodMarketplace";
import { loadSeason } from "./utils/Season";
import { loadFirm, loadFirmDailySnapshot, loadFirmHourlySnapshot } from "./utils/Firm";
import { addDepositToFirmAsset, updateHordeWithCalls } from "./FirmHandler";
import { updateHooliganEMA } from "./YieldHandler";
import { loadFirmAssetDailySnapshot, loadFirmAssetHourlySnapshot } from "./utils/FirmAsset";

export function handleSunrise(event: Sunrise): void {
    let currentSeason = event.params.season.toI32()
    let season = loadSeason(event.address, event.params.season)

    // Update any guvnors that had firm transfers from the prior season
    updateHordeWithCalls(currentSeason - 1, event.block.timestamp, event.block.number)

    // Update season metrics
    //season.draftableIndex = hooliganhordeContract.draftableIndex()
    if (event.params.season == BigInt.fromI32(6075)) { season.price = BigDecimal.fromString('1.07') } // Replant oracle initialization
    season.createdAt = event.block.timestamp
    season.save()

    // Update field metrics
    let field = loadField(event.address)
    let fieldHourly = loadFieldHourly(event.address, field.season, event.block.timestamp)
    let fieldDaily = loadFieldDaily(event.address, event.block.timestamp)

    // -- Field level totals
    field.season = currentSeason
    field.rookieRate = season.hooligans == ZERO_BI ? ZERO_BD : toDecimal(field.undraftableRookies, 6).div(toDecimal(season.hooligans, 6))
    fieldHourly.rookieRate = field.podRate
    fieldDaily.season = currentSeason
    fieldDaily.rookieRate = field.podRate

    field.save()
    fieldHourly.save()
    fieldDaily.save()

    // Marketplace Season Update

    let market = loadRookieMarketplace(event.address)
    let marketHourly = loadRookieMarketplaceHourlySnapshot(event.address, market.season, event.block.timestamp)
    let marketDaily = loadRookieMarketplaceDailySnapshot(event.address, event.block.timestamp)
    market.season = currentSeason
    marketHourly.season = currentSeason
    marketDaily.season = currentSeason
    market.save()
    marketHourly.save()
    marketDaily.save()

    let remainingListings = market.listingIndexes

    // Cancel any rookie marketplace listings beyond the index
    for (let i = 0; i < market.listingIndexes.length; i++) {
        if (market.listingIndexes[i] < season.draftableIndex) {
            expireRookieListing(event.address, event.block.timestamp, market.listingIndexes[i])
            remainingListings.shift()
        } else {
            let listing = loadRookieListing(event.address, market.listingIndexes[i])
            if (listing.maxDraftableIndex < season.draftableIndex) {
                expireRookieListing(event.address, event.block.timestamp, market.listingIndexes[i])
                let listingIndex = market.listingIndexes.indexOf(listing.index)
                remainingListings.splice(listingIndex, 1)
            }
        }
    }

    market.listingIndexes = remainingListings
    market.save()

    // Create firm entities for the protocol
    let firm = loadFirm(event.address)
    loadFirmHourlySnapshot(event.address, currentSeason, event.block.timestamp)
    loadFirmDailySnapshot(event.address, event.block.timestamp)
    for (let i = 0; i < firm.whitelistedTokens.length; i++) {
        loadFirmAssetHourlySnapshot(event.address, Address.fromString(firm.whitelistedTokens[i]), currentSeason, event.block.timestamp)
        loadFirmAssetDailySnapshot(event.address, Address.fromString(firm.whitelistedTokens[i]), event.block.timestamp)
    }
}

export function handleSeasonSnapshot(event: SeasonSnapshot): void {
    let season = loadSeason(event.address, event.params.season)
    season.price = toDecimal(event.params.price, 18)
    season.save()
}

export function handleReward(event: Reward): void {
    let id = 'reward-' + event.transaction.hash.toHexString() + '-' + event.transactionLogIndex.toString()
    let reward = new RewardEntity(id)
    reward.hash = event.transaction.hash.toHexString()
    reward.logIndex = event.transactionLogIndex.toI32()
    reward.protocol = event.address.toHexString()
    reward.season = event.params.season.toI32()
    reward.toField = event.params.toField
    reward.toFirm = event.params.toFirm
    reward.toPercoceter = event.params.toFertilizer
    reward.blockNumber = event.block.number
    reward.createdAt = event.block.timestamp
    reward.save()

    let season = loadSeason(event.address, event.params.season)
    season.rewardHooligans = reward.toField.plus(reward.toFirm).plus(reward.toPercoceter)
    season.save()

    // Add to total Firm Hooligan mints

    let firm = loadFirm(event.address)
    let firmHourly = loadFirmHourlySnapshot(event.address, season.season, event.block.timestamp)
    let firmDaily = loadFirmDailySnapshot(event.address, event.block.timestamp)
    let newPlantableHorde = event.params.toFirm.times(BigInt.fromI32(10000)) // Horde has 10 decimals

    firm.hooliganMints = firm.hooliganMints.plus(event.params.toFirm)
    firm.plantableHorde = firm.plantableHorde.plus(newPlantableHorde)
    firm.depositedBDV = firm.depositedBDV.plus(event.params.toFirm)
    firm.save()

    firmHourly.hooliganMints = firm.hooliganMints
    firmHourly.plantableHorde = firm.plantableHorde
    firmHourly.depositedBDV = firm.depositedBDV
    firmHourly.deltaHooliganMints = firmHourly.deltaHooliganMints.plus(event.params.toFirm)
    firmHourly.deltaPlantableHorde = firmHourly.deltaPlantableHorde.plus(newPlantableHorde)
    firmHourly.deltaDepositedBDV = firmHourly.deltaDepositedBDV.plus(event.params.toFirm)
    firmHourly.save()

    firmDaily.hooliganMints = firm.hooliganMints
    firmDaily.plantableHorde = firm.plantableHorde
    firmDaily.depositedBDV = firm.depositedBDV
    firmDaily.deltaHooliganMints = firmDaily.deltaHooliganMints.plus(event.params.toFirm)
    firmDaily.deltaPlantableHorde = firmDaily.deltaPlantableHorde.plus(newPlantableHorde)
    firmDaily.deltaDepositedBDV = firmDaily.deltaDepositedBDV.plus(event.params.toFirm)
    firmDaily.save()

    addDepositToFirmAsset(event.address, HOOLIGAN_ERC20, event.params.season.toI32(), event.params.toFirm, event.params.toFirm, event.block.timestamp, event.block.number)
}


export function handleMetapoolOracle(event: MetapoolOracle): void {
    let id = 'metapoolOracle-' + event.transaction.hash.toHexString() + '-' + event.transactionLogIndex.toString()
    let oracle = new MetapoolOracleEntity(id)
    oracle.hash = event.transaction.hash.toHexString()
    oracle.logIndex = event.transactionLogIndex.toI32()
    oracle.protocol = event.address.toHexString()
    oracle.season = event.params.season.toI32()
    oracle.deltaB = event.params.deltaB
    oracle.balanceA = event.params.balances[0]
    oracle.balanceB = event.params.balances[1]
    oracle.blockNumber = event.block.number
    oracle.createdAt = event.block.timestamp
    oracle.save()

    let curvePrice = CurvePrice.bind(CURVE_PRICE)
    let season = loadSeason(event.address, event.params.season)
    season.price = toDecimal(curvePrice.getCurve().price, 6)
    season.deltaB = event.params.deltaB
    season.save()
}

export function handleRage(event: Rage): void {
    // Replant sets the rage to the amount every season instead of adding new rage
    // to an existing amount.

    let field = loadField(event.address)
    let fieldHourly = loadFieldHourly(event.address, event.params.season.toI32(), event.block.timestamp)
    let fieldDaily = loadFieldDaily(event.address, event.block.timestamp)

    field.season = event.params.season.toI32()
    field.rage = event.params.rage
    field.save()

    fieldHourly.rage = field.rage
    fieldHourly.issuedRage = fieldHourly.issuedRage.plus(event.params.rage)
    fieldHourly.updatedAt = event.block.timestamp
    fieldHourly.save()

    fieldDaily.rage = field.rage
    fieldDaily.issuedRage = fieldDaily.issuedRage.plus(event.params.rage)
    fieldDaily.updatedAt = event.block.timestamp
    fieldDaily.save()

    if (event.params.season.toI32() >= 6075) {
        updateHooliganEMA(event.params.season.toI32(), event.block.timestamp)
    }
}

export function handleIncentive(event: Incentivization): void {
    // This is the final function to be called during sunrise both pre and post replant
    let id = 'incentive-' + event.transaction.hash.toHexString() + '-' + event.transactionLogIndex.toString()
    let incentive = new Incentive(id)
    incentive.hash = event.transaction.hash.toHexString()
    incentive.logIndex = event.transactionLogIndex.toI32()
    incentive.protocol = event.address.toHexString()
    incentive.caller = event.params.account.toHexString()
    incentive.amount = event.params.hooligans
    incentive.blockNumber = event.block.number
    incentive.createdAt = event.block.timestamp
    incentive.save()

    // Update market cap for season
    let hooliganhorde = loadHooliganhorde(event.address)
    let hooliganhorde_contract = Hooliganhorde.bind(HOOLIGANHORDE)
    let season = loadSeason(event.address, BigInt.fromI32(hooliganhorde.lastSeason))

    season.marketCap = season.price.times(toDecimal(season.hooligans))
    season.incentiveHooligans = event.params.hooligans
    season.draftableIndex = hooliganhorde_contract.draftableIndex()
    season.save()

    updateDraftablePlots(season.draftableIndex, event.block.timestamp, event.block.number)
}
