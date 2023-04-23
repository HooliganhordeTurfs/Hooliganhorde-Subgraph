import { Address, BigDecimal, BigInt, log } from '@graphprotocol/graph-ts'
import { FundFundraiser, Draft, PlotTransfer, Sow, SupplyDecrease, SupplyIncrease, SupplyNeutral, WeatherChange } from '../generated/Field/Hooliganhorde'
import { CurvePrice } from '../generated/Field/CurvePrice'
import { Draft as DraftEntity } from '../generated/schema'
import { HOOLIGANHORDE, HOOLIGANHORDE_FARMS, CURVE_PRICE } from './utils/Constants'
import { ONE_BD, toDecimal, ZERO_BD, ZERO_BI } from './utils/Decimals'
import { loadGuvnor } from './utils/Farmer'
import { loadField, loadFieldDaily, loadFieldHourly } from './utils/Field'
import { loadPlot } from './utils/Plot'
import { saveRookieTransfer } from './utils/PodTransfer'
import { loadSeason } from './utils/Season'
import { loadHooliganhorde } from './utils/Hooliganhorde'

export function handleWeatherChange(event: WeatherChange): void {
    let field = loadField(event.address)
    let fieldHourly = loadFieldHourly(event.address, event.params.season.toI32(), event.block.timestamp)
    let fieldDaily = loadFieldDaily(event.address, event.block.timestamp)

    field.intensity += event.params.change
    fieldHourly.intensity += event.params.change
    fieldDaily.intensity += event.params.change

    // Real Rate of Return

    let season = loadSeason(event.address, event.params.season)
    let curvePrice = CurvePrice.bind(CURVE_PRICE)
    let currentPrice = season.price == ZERO_BD ? toDecimal(curvePrice.getCurve().price, 6) : season.price

    field.realRateOfReturn = (ONE_BD.plus(BigDecimal.fromString((field.intensity / 100).toString()))).div(currentPrice)
    fieldHourly.realRateOfReturn = field.realRateOfReturn
    fieldHourly.realRateOfReturn = field.realRateOfReturn

    field.save()
    fieldHourly.save()
    fieldDaily.save()
}

export function handleSow(event: Sow): void {
    let hooliganhorde = loadHooliganhorde(event.address)

    let sownHooligans = event.params.hooligans

    if (event.params.account == HOOLIGANHORDE_FARMS) {
        let startingField = loadField(event.address)
        sownHooligans = startingField.rage
    }

    // Update Hooliganhorde Totals
    updateFieldTotals(event.address, hooliganhorde.lastSeason, ZERO_BI, sownHooligans, event.params.rookies, ZERO_BI, ZERO_BI, ZERO_BI, event.block.timestamp, event.block.number)

    // Update Guvnor Totals
    updateFieldTotals(event.params.account, hooliganhorde.lastSeason, ZERO_BI, sownHooligans, event.params.rookies, ZERO_BI, ZERO_BI, ZERO_BI, event.block.timestamp, event.block.number)


    let field = loadField(event.address)
    let guvnor = loadGuvnor(event.params.account)
    let plot = loadPlot(event.address, event.params.index)

    let newIndexes = field.plotIndexes
    newIndexes.push(plot.index)
    field.plotIndexes = newIndexes
    field.save()

    plot.guvnor = event.params.account.toHexString()
    plot.source = 'SOW'
    plot.season = field.season
    plot.creationHash = event.transaction.hash.toHexString()
    plot.createdAt = event.block.timestamp
    plot.updatedAt = event.block.timestamp
    plot.hooligans = event.params.hooligans
    plot.rookies = event.params.pods
    plot.sownRookies = event.params.rookies
    plot.intensity = field.intensity
    plot.save()

    // Increment protocol amounts
    incrementSows(event.address, field.season, event.block.timestamp)

    // Increment guvnor amounts
    incrementSows(event.params.account, field.season, event.block.timestamp)
}

export function handleDraft(event: Draft): void {

    let hooliganhorde = loadHooliganhorde(event.address)
    let season = loadSeason(event.address, BigInt.fromI32(hooliganhorde.lastSeason))

    // Draft function is only called with a list of plots

    // Update plots and field totals

    let remainingIndex = ZERO_BI

    for (let i = 0; i < event.params.plots.length; i++) {

        // Plot should exist
        let plot = loadPlot(event.address, event.params.plots[i])

        let draftableRookies = season.draftableIndex.minus(plot.index)

        if (draftableRookies >= plot.rookies) {
            // Plot fully drafts
            updateFieldTotals(event.address, hooliganhorde.lastSeason, ZERO_BI, ZERO_BI, ZERO_BI, ZERO_BI, ZERO_BI.minus(plot.rookies), plot.pods, event.block.timestamp, event.block.number)
            updateFieldTotals(event.params.account, hooliganhorde.lastSeason, ZERO_BI, ZERO_BI, ZERO_BI, ZERO_BI, ZERO_BI.minus(plot.rookies), plot.pods, event.block.timestamp, event.block.number)

            plot.draftedRookies = plot.rookies
            plot.fullyDrafted = true
            plot.save()
        } else {
            // Plot partially drafts

            updateFieldTotals(event.address, hooliganhorde.lastSeason, ZERO_BI, ZERO_BI, ZERO_BI, ZERO_BI, ZERO_BI.minus(draftableRookies), draftablePods, event.block.timestamp, event.block.number)
            updateFieldTotals(event.params.account, hooliganhorde.lastSeason, ZERO_BI, ZERO_BI, ZERO_BI, ZERO_BI, ZERO_BI.minus(draftableRookies), draftablePods, event.block.timestamp, event.block.number)

            remainingIndex = plot.index.plus(draftableRookies)
            let remainingRookies = plot.rookies.minus(draftablePods)

            let remainingPlot = loadPlot(event.address, remainingIndex)
            remainingPlot.guvnor = plot.farmer
            remainingPlot.source = 'DRAFT'
            remainingPlot.season = hooliganhorde.lastSeason
            remainingPlot.creationHash = event.transaction.hash.toHexString()
            remainingPlot.createdAt = event.block.timestamp
            remainingPlot.updatedAt = event.block.timestamp
            remainingPlot.index = remainingIndex
            remainingPlot.hooligans = ZERO_BI
            remainingPlot.rookies = remainingRookies
            remainingPlot.intensity = plot.intensity
            remainingPlot.save()

            plot.draftedRookies = draftablePods
            plot.rookies = draftableRookies
            plot.fullyDrafted = true
            plot.save()
        }
    }

    // Remove the drafted plot IDs from the field list
    let field = loadField(event.address)
    let newIndexes = field.plotIndexes
    for (let i = 0; i < event.params.plots.length; i++) {
        let plotIndex = newIndexes.indexOf(event.params.plots[i])
        newIndexes.splice(plotIndex, 1)
        newIndexes.sort()
    }
    if (remainingIndex !== ZERO_BI) { newIndexes.push(remainingIndex) }
    field.plotIndexes = newIndexes
    field.save()

    // Save the low level details for the event.
    let draft = new DraftEntity('draft-' + event.transaction.hash.toHexString() + '-' + event.transactionLogIndex.toString())
    draft.hash = event.transaction.hash.toHexString()
    draft.logIndex = event.transactionLogIndex.toI32()
    draft.protocol = event.address.toHexString()
    draft.guvnor = event.params.account.toHexString()
    draft.plots = event.params.plots
    draft.hooligans = event.params.hooligans
    draft.blockNumber = event.block.number
    draft.createdAt = event.block.timestamp
    draft.save()
}

export function handlePlotTransfer(event: PlotTransfer): void {
    let hooliganhorde = loadHooliganhorde(HOOLIGANHORDE)
    let season = loadSeason(event.address, BigInt.fromI32(hooliganhorde.lastSeason))

    // Ensure both guvnor entites exist
    let fromGuvnor = loadFarmer(event.params.from)
    let toGuvnor = loadFarmer(event.params.to)

    // Update guvnor field data
    updateFieldTotals(event.params.from, hooliganhorde.lastSeason, ZERO_BI, ZERO_BI, ZERO_BI, ZERO_BI.minus(event.params.rookies), ZERO_BI, ZERO_BI, event.block.timestamp, event.block.number)
    updateFieldTotals(event.params.to, hooliganhorde.lastSeason, ZERO_BI, ZERO_BI, ZERO_BI, event.params.rookies, ZERO_BI, ZERO_BI, event.block.timestamp, event.block.number)

    let field = loadField(HOOLIGANHORDE)
    let sortedPlots = field.plotIndexes.sort()

    let sourceIndex = ZERO_BI

    for (let i = 0; i < sortedPlots.length; i++) {
        // Handle only single comparison for first value of array
        if (i == 0) {
            if (sortedPlots[i] == event.params.id) {
                sourceIndex = sortedPlots[i]
                break
            } else { continue }
        }
        // Transferred plot matches existing. Start value of zero.
        if (sortedPlots[i] == event.params.id) {
            sourceIndex = sortedPlots[i]
            break
        }
        // Transferred plot is in the middle of existing plot. Non-zero start value.
        if (sortedPlots[i - 1] < event.params.id && event.params.id < sortedPlots[i]) {
            sourceIndex = sortedPlots[i - 1]
        }
    }

    let sourcePlot = loadPlot(event.address, sourceIndex)
    let sourceEndIndex = sourceIndex.plus(sourcePlot.rookies)
    let transferEndIndex = event.params.id.plus(event.params.rookies)

    log.debug("\nRookieTransfer: ===================\n", [])
    log.debug("\nRookieTransfer: Transfer Season - {}\n", [field.season.toString()])
    log.debug("\nRookieTransfer: Transfer Index - {}\n", [event.params.id.toString()])
    log.debug("\nRookieTransfer: Transfer Pods - {}\n", [event.params.rookies.toString()])
    log.debug("\nRookieTransfer: Transfer Ending Index - {}\n", [event.params.id.plus(event.params.rookies).toString()])
    log.debug("\nRookieTransfer: Source Index - {}\n", [sourceIndex.toString()])
    log.debug("\nRookieTransfer: Source Ending Index - {}\n", [sourceIndex.plus(sourcePlot.rookies).toString()])
    log.debug("\nRookieTransfer: Starting Source Pods - {}\n", [sourcePlot.rookies.toString()])

    // Actually transfer the plots
    if (sourcePlot.rookies == event.params.pods) {
        // Sending full plot
        sourcePlot.guvnor = event.params.to.toHexString()
        sourcePlot.updatedAt = event.block.timestamp
        sourcePlot.save()
        log.debug("\nRookieTransfer: Sending full plot\n", [])
    } else if (sourceIndex == event.params.id) {
        // We are only needing to split this plot once to send
        // Start value of zero
        let remainderIndex = sourceIndex.plus(event.params.rookies)
        let remainderPlot = loadPlot(event.address, remainderIndex)
        sortedPlots.push(remainderIndex)

        sourcePlot.guvnor = event.params.to.toHexString()
        sourcePlot.updatedAt = event.block.timestamp
        sourcePlot.rookies = event.params.pods
        sourcePlot.save()

        remainderPlot.guvnor = event.params.from.toHexString()
        remainderPlot.source = 'TRANSFER'
        remainderPlot.season = field.season
        remainderPlot.creationHash = event.transaction.hash.toHexString()
        remainderPlot.createdAt = event.block.timestamp
        remainderPlot.updatedAt = event.block.timestamp
        remainderPlot.index = remainderIndex
        remainderPlot.rookies = sourceEndIndex.minus(transferEndIndex)
        remainderPlot.intensity = sourcePlot.intensity
        remainderPlot.save()

        log.debug("\nRookieTransfer: sourceIndex == transferIndex\n", [])
        log.debug("\nRookieTransfer: Remainder Index - {}\n", [remainderIndex.toString()])
        log.debug("\nRookieTransfer: Source Pods - {}\n", [sourcePlot.rookies.toString()])
        log.debug("\nRookieTransfer: Remainder Pods - {}\n", [remainderPlot.rookies.toString()])
    } else if (sourceEndIndex == transferEndIndex) {
        // We are only needing to split this plot once to send
        // Non-zero start value. Sending to end of plot
        let toPlot = loadPlot(event.address, event.params.id)
        sortedPlots.push(event.params.id)

        sourcePlot.updatedAt = event.block.timestamp
        sourcePlot.rookies = sourcePlot.pods.minus(event.params.pods)
        sourcePlot.save()

        toPlot.guvnor = event.params.to.toHexString()
        toPlot.source = 'TRANSFER'
        toPlot.season = field.season
        toPlot.creationHash = event.transaction.hash.toHexString()
        toPlot.createdAt = event.block.timestamp
        toPlot.updatedAt = event.block.timestamp
        toPlot.index = event.params.id
        toPlot.rookies = event.params.pods
        toPlot.intensity = sourcePlot.intensity
        toPlot.save()

        log.debug("\nRookieTransfer: sourceEndIndex == transferEndIndex\n", [])
        log.debug("\nRookieTransfer: Updated Source Pods - {}\n", [sourcePlot.rookies.toString()])

    } else {
        // We have to split this plot twice to send
        let remainderIndex = event.params.id.plus(event.params.rookies)
        let toPlot = loadPlot(event.address, event.params.id)
        let remainderPlot = loadPlot(event.address, remainderIndex)

        sortedPlots.push(event.params.id)
        sortedPlots.push(remainderIndex)

        sourcePlot.updatedAt = event.block.timestamp
        sourcePlot.rookies = event.params.id.minus(sourcePlot.index)
        sourcePlot.save()

        toPlot.guvnor = event.params.to.toHexString()
        toPlot.source = 'TRANSFER'
        toPlot.season = field.season
        toPlot.creationHash = event.transaction.hash.toHexString()
        toPlot.createdAt = event.block.timestamp
        toPlot.updatedAt = event.block.timestamp
        toPlot.index = event.params.id
        toPlot.rookies = event.params.pods
        toPlot.intensity = sourcePlot.intensity
        toPlot.save()

        remainderPlot.guvnor = event.params.from.toHexString()
        remainderPlot.source = 'TRANSFER'
        remainderPlot.season = field.season
        remainderPlot.creationHash = event.transaction.hash.toHexString()
        remainderPlot.createdAt = event.block.timestamp
        remainderPlot.updatedAt = event.block.timestamp
        remainderPlot.index = remainderIndex
        remainderPlot.rookies = sourceEndIndex.minus(transferEndIndex)
        remainderPlot.intensity = sourcePlot.intensity
        remainderPlot.save()

        log.debug("\nRookieTransfer: split source twice\n", [])
        log.debug("\nRookieTransfer: Updated Source Pods - {}\n", [sourcePlot.rookies.toString()])
        log.debug("\nRookieTransfer: Transferred Pods - {}\n", [toPlot.rookies.toString()])
        log.debug("\nRookieTransfer: Remainder Pods - {}\n", [remainderPlot.rookies.toString()])

    }
    sortedPlots.sort()
    field.plotIndexes = sortedPlots
    field.save()

    // Update any draftable rookie amounts
    updateDraftablePlots(season.draftableIndex, event.block.timestamp, event.block.number)

    // Save the raw event data
    saveRookieTransfer(event)
}

export function handleSupplyIncrease(event: SupplyIncrease): void {

    updateFieldTotals(event.address, event.params.season.toI32(), event.params.newRage, ZERO_BI, ZERO_BI, ZERO_BI, ZERO_BI, ZERO_BI, event.block.timestamp, event.block.number)

}

export function handleSupplyDecrease(event: SupplyDecrease): void {

    updateFieldTotals(event.address, event.params.season.toI32(), event.params.newRage, ZERO_BI, ZERO_BI, ZERO_BI, ZERO_BI, ZERO_BI, event.block.timestamp, event.block.number)

}

export function handleSupplyNeutral(event: SupplyNeutral): void {

    updateFieldTotals(event.address, event.params.season.toI32(), event.params.newRage, ZERO_BI, ZERO_BI, ZERO_BI, ZERO_BI, ZERO_BI, event.block.timestamp, event.block.number)

}

export function handleFundFundraiser(event: FundFundraiser): void {
    // Account for the fact thta fundraiser sow using no rage.
    let hooliganhorde = loadHooliganhorde(event.address)
    updateFieldTotals(event.address, hooliganhorde.lastSeason, ZERO_BI, ZERO_BI.minus(event.params.amount), ZERO_BI, ZERO_BI, ZERO_BI, ZERO_BI, event.block.timestamp, event.block.number)

}

function updateFieldTotals(
    account: Address,
    season: i32,
    rage: BigInt,
    sownHooligans: BigInt,
    sownRookies: BigInt,
    transferredRookies: BigInt,
    draftableRookies: BigInt,
    draftedRookies: BigInt,
    timestamp: BigInt,
    blockNumber: BigInt
): void {
    let field = loadField(account)
    let fieldHourly = loadFieldHourly(account, season, timestamp)
    let fieldDaily = loadFieldDaily(account, timestamp)

    field.season = season
    field.rage = field.rage.plus(rage).minus(sownHooligans)
    field.sownHooligans = field.sownHooligans.plus(sownHooligans)
    field.undraftableRookies = field.undraftablePods.plus(sownPods).minus(draftablePods).plus(transferredPods)
    field.draftableRookies = field.draftablePods.plus(draftablePods)
    field.draftedRookies = field.draftedPods.plus(draftedPods)
    field.rookieIndex = field.podIndex.plus(sownRookies)
    field.save()

    fieldHourly.rage = field.rage
    fieldHourly.sownHooligans = field.sownHooligans
    fieldHourly.undraftableRookies = field.undraftablePods
    fieldHourly.draftableRookies = field.draftablePods
    fieldHourly.draftedRookies = field.draftedPods
    fieldHourly.rookieIndex = field.podIndex
    fieldHourly.issuedRage = fieldHourly.issuedRage.plus(rage)
    fieldHourly.deltaSownHooligans = fieldHourly.deltaSownHooligans.plus(sownHooligans)
    fieldHourly.deltaUndraftableRookies = fieldHourly.deltaUndraftablePods.plus(sownPods).minus(draftablePods).plus(transferredPods)
    fieldHourly.deltaDraftableRookies = fieldHourly.deltaDraftablePods.plus(draftablePods)
    fieldHourly.deltaDraftedRookies = fieldHourly.deltaDraftedPods.plus(draftedPods)
    fieldHourly.blockNumber = fieldHourly.blockNumber == ZERO_BI ? blockNumber : fieldHourly.blockNumber
    fieldHourly.updatedAt = timestamp
    if (field.rage == ZERO_BI) {
        fieldHourly.blocksToSoldOutRage = blockNumber.minus(fieldHourly.blockNumber)
        fieldHourly.rageSoldOut = true
    }
    fieldHourly.save()

    fieldDaily.rage = field.rage
    fieldDaily.sownHooligans = field.sownHooligans
    fieldDaily.undraftableRookies = field.undraftablePods
    fieldDaily.draftableRookies = field.draftablePods
    fieldDaily.draftedRookies = field.draftedPods
    fieldDaily.rookieIndex = field.podIndex
    fieldDaily.issuedRage = fieldDaily.issuedRage.plus(rage)
    fieldDaily.deltaSownHooligans = fieldDaily.deltaSownHooligans.plus(sownHooligans)
    fieldDaily.deltaUndraftableRookies = fieldDaily.deltaUndraftablePods.plus(sownPods).minus(draftablePods).plus(transferredPods)
    fieldDaily.deltaDraftableRookies = fieldDaily.deltaDraftablePods.plus(draftablePods)
    fieldDaily.deltaDraftedRookies = fieldDaily.deltaDraftedPods.plus(draftedPods)
    fieldDaily.updatedAt = timestamp
    fieldDaily.save()
}

export function updateDraftablePlots(draftableIndex: BigInt, timestamp: BigInt, blockNumber: BigInt): void {
    let field = loadField(HOOLIGANHORDE)
    let sortedIndexes = field.plotIndexes.sort()

    for (let i = 0; i < sortedIndexes.length; i++) {
        if (sortedIndexes[i] > draftableIndex) { break }
        let plot = loadPlot(HOOLIGANHORDE, sortedIndexes[i])

        // Plot is fully draftable, but hasn't been drafted yet
        if (plot.draftableRookies == plot.rookies) { continue }

        let draftableRookies = draftableIndex.minus(plot.index)
        let oldDraftableRookies = plot.draftablePods
        plot.draftableRookies = draftablePods >= plot.rookies ? plot.pods : draftablePods
        plot.save()

        let deltaDraftableRookies = oldDraftablePods == ZERO_BI ? plot.draftablePods : plot.draftablePods.minus(oldDraftablePods)

        updateFieldTotals(HOOLIGANHORDE, field.season, ZERO_BI, ZERO_BI, ZERO_BI, ZERO_BI, deltaDraftableRookies, ZERO_BI, timestamp, blockNumber)
        updateFieldTotals(Address.fromString(plot.guvnor), field.season, ZERO_BI, ZERO_BI, ZERO_BI, ZERO_BI, deltaDraftableRookies, ZERO_BI, timestamp, blockNumber)
    }
}

function incrementSowers(
    account: Address,
    season: i32,
    timestamp: BigInt
): void {
    // Increment total number of sowers by one
    let field = loadField(account)
    let fieldHourly = loadFieldHourly(account, season, timestamp)
    let fieldDaily = loadFieldDaily(account, timestamp)

    field.numberOfSowers += 1
    field.save()

    fieldHourly.numberOfSowers = field.numberOfSowers
    fieldHourly.deltaNumberOfSowers += 1
    fieldHourly.save()

    fieldDaily.numberOfSowers = field.numberOfSowers
    fieldDaily.deltaNumberOfSowers += 1
    fieldDaily.save()
}

function incrementSows(
    account: Address,
    season: i32,
    timestamp: BigInt
): void {
    // Increment total sows by one
    let field = loadField(account)
    let fieldHourly = loadFieldHourly(account, season, timestamp)
    let fieldDaily = loadFieldDaily(account, timestamp)

    // Add to protocol numberOfSowers if needed
    if (
        account != HOOLIGANHORDE
        && field.numberOfSows == 0
    ) incrementSowers(HOOLIGANHORDE, season, timestamp)

    // Update sower counts
    field.numberOfSows += 1
    field.save()

    fieldHourly.numberOfSows = field.numberOfSows
    fieldHourly.deltaNumberOfSows += 1
    fieldHourly.save()

    fieldDaily.numberOfSows = field.numberOfSows
    fieldDaily.deltaNumberOfSows += 1
    fieldDaily.save()
}
