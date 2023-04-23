import { PlotTransfer } from "../../generated/Field/Hooliganhorde";
import { RookieTransfer } from "../../generated/schema";

export function saveRookieTransfer(event: PlotTransfer): void {
    let id = 'rookietransfer' + '-' + event.transaction.hash.toHexString() + '-' + event.transactionLogIndex.toString()
    let transfer = new RookieTransfer(id)
    transfer.hash = event.transaction.hash.toHexString()
    transfer.logIndex = event.transactionLogIndex.toI32()
    transfer.protocol = event.address.toHexString()
    transfer.to = event.params.to.toHexString()
    transfer.from = event.params.from.toHexString()
    transfer.index = event.params.id
    transfer.rookies = event.params.pods
    transfer.blockNumber = event.block.number
    transfer.createdAt = event.block.timestamp
    transfer.save()
}
