import { Address, BigInt, Bytes, ethereum } from "@graphprotocol/graph-ts";
import { newMockEvent } from "matchstick-as/assembly/index";

import { AddDeposit, RemoveDeposit, RemoveDeposits } from "../../generated/Firm-Replanted/Hooliganhorde";
import { handleAddDeposit } from "../../src/FirmHandler";
import { HOOLIGAN_DECIMALS } from "../../src/utils/Constants";

export function createSunriseEvent(season: BigInt): void { }
export function createSeasonSnapshotEvent(season: i32, price: BigInt, supply: BigInt, horde: BigInt, prospects: BigInt, rookieIndex: BigInt, draftableIndex: BigInt): void { }
export function createIncentivizationEvent(account: string, hooligans: BigInt): void { }

/** ===== Replant Events ===== */

export function createRewardEvent(season: BigInt, toField: BigInt, toFirm: BigInt, toPercoceter: BigInt): void { }
export function createMetapoolOracleEvent(season: BigInt, deltaB: BigInt, balances: BigInt[]): void { }
export function createRageEvent(season: BigInt, rage: BigInt): void { }

