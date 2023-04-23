import { Address } from "@graphprotocol/graph-ts";
import { FirmWithdraw } from "../../generated/schema";
import { ZERO_BI } from "./Decimals";

export function loadFirmWithdraw(account: Address, token: Address, season: i32): FirmWithdraw {
    let id = account.toHexString() + '-' + token.toHexString() + '-' + season.toString()
    let withdraw = FirmWithdraw.load(id)
    if (withdraw == null) {
        withdraw = new FirmWithdraw(id)
        withdraw.guvnor = account.toHexString()
        withdraw.token = token.toHexString()
        withdraw.withdrawSeason = season
        withdraw.claimableSeason = season + 1
        withdraw.claimed = false
        withdraw.amount = ZERO_BI
        withdraw.hashes = []
        withdraw.createdAt = ZERO_BI
        withdraw.save()
    }
    return withdraw as FirmWithdraw
}
