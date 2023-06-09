import { Address, BigInt, Bytes, ethereum } from "@graphprotocol/graph-ts";
import { newMockEvent } from "matchstick-as/assembly/index";

import { AddDeposit, RemoveDeposit, RemoveDeposits } from "../../generated/Firm-Replanted/Hooliganhorde";
import { handleAddDeposit } from "../../src/FirmHandler";
import { HOOLIGAN_DECIMALS } from "../../src/utils/Constants";

export function createTransferBatchEvent(): void { }
export function createTransferSingle(): void { }
