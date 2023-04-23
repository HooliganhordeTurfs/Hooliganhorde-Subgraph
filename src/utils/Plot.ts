import { Address, BigInt } from "@graphprotocol/graph-ts";
import { Plot } from "../../generated/schema";
import { ADDRESS_ZERO } from "./Constants";
import { ZERO_BI } from "./Decimals";
import { loadField } from "./Field";

export function loadPlot(diamondAddress: Address, index: BigInt): Plot {
    let plot = Plot.load(index.toString())
    if (plot == null) {
        plot = new Plot(index.toString())
        plot.field = diamondAddress.toHexString()
        plot.guvnor = ADDRESS_ZERO.toHexString()
        plot.source = 'SOW' // Assume new plots come from sowing
        plot.season = 0
        plot.creationHash = ''
        plot.createdAt = ZERO_BI
        plot.updatedAt = ZERO_BI
        plot.index = index
        plot.hooligans = ZERO_BI
        plot.rookies = ZERO_BI
        plot.sownRookies = ZERO_BI
        plot.intensity = 0
        plot.draftableRookies = ZERO_BI
        plot.draftedRookies = ZERO_BI
        plot.fullyDrafted = false
        plot.save()

        let field = loadField(diamondAddress)
        field.plotIndexes.push(plot.index)
        field.save()

    }
    return plot
}
