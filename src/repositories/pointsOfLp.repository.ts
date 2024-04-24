import { Injectable } from "@nestjs/common";
import { UnitOfWork } from "../unitOfWork";
import { PointsOfLp } from "../entities";

@Injectable()
export class PointsOfLpRepository {
  public constructor(private readonly unitOfWork: UnitOfWork) {}

  public async add(address: Buffer, pairAddress: Buffer, stakePoint: number): Promise<void> {
    const transactionManager = this.unitOfWork.getTransactionManager();
    await transactionManager.query(
      `INSERT INTO "pointsOfLp" (address, "pairAddress", "stakePoint") VALUES ($1,$2,$3) 
            ON CONFLICT (address, "pairAddress") 
            DO UPDATE
            SET "stakePoint" = $3
            `,
      [address, pairAddress, stakePoint]
    );
  }

  public async updateDeposits(pairAddressBuf: Buffer, deposits: Map<string, number>): Promise<void> {
    const transactionManager = this.unitOfWork.getTransactionManager();
    for (const [address, depositPoint] of deposits) {
      const addrBuf = Buffer.from(address.substring(2), "hex");
      const ret = await transactionManager.query(
        `SELECT "stakePoint"
           FROM "pointsOfLp"
           WHERE address = $1 AND "pairAddress" = $2`,
        [addrBuf, pairAddressBuf]
      );
      if (!ret || ret.length == 0) {
        await transactionManager.query(
          `INSERT INTO "pointsOfLp" (address, "pairAddress", "stakePoint")
             VALUES ($1, $2, $3)`,
          [addrBuf, pairAddressBuf, depositPoint]
        );
      } else {
        await transactionManager.query(
          `UPDATE "pointsOfLp" SET "stakePoint" = "stakePoint" + $3 WHERE address = $1 And "pairAddress" = $2`,
          [addrBuf, pairAddressBuf, depositPoint]
        );
      }
    }
  }

  public async getStakePointByAddress(pairAddress: Buffer, address: Buffer): Promise<number> {
    const transactionManager = this.unitOfWork.getTransactionManager();
    const accountPoint = await transactionManager.query(
      `SELECT "stakePoint" FROM "pointsOfLp" WHERE address = $1 And "pairAddress" = $2`,
      [address, pairAddress]
    );
    return accountPoint?.stakePoint || 0;
  }

  public async getPointByAddress(address: string, pairAddress: string): Promise<PointsOfLp> {
    const transactionManager = this.unitOfWork.getTransactionManager();
    return await transactionManager.findOne<PointsOfLp>(PointsOfLp, {
      where: { address, pairAddress },
    });
  }

  public createDefaultPoint(address: string, pairAddress: string): PointsOfLp {
    return {
      id: 0,
      address,
      pairAddress,
      stakePoint: 0,
    };
  }

  public async getLastStatisticalBlockNumber(): Promise<number> {
    const transactionManager = this.unitOfWork.getTransactionManager();
    const [fromBlockNumber] = await transactionManager.query(
      `SELECT last_value FROM "pointOfLpStatisticalBlockNumber";`
    );
    return Number(fromBlockNumber.last_value);
  }

  public async setStatisticalBlockNumber(blockNumber: number): Promise<void> {
    const transactionManager = this.unitOfWork.getTransactionManager();
    await transactionManager.query(`SELECT setval('"pointOfLpStatisticalBlockNumber"', $1, false);`, [blockNumber]);
  }

  public async getLastHoldPointStatisticalBlockNumber(): Promise<number> {
    const transactionManager = this.unitOfWork.getTransactionManager();
    const [fromBlockNumber] = await transactionManager.query(
      `SELECT last_value FROM "holdPointOfLpStatisticalBlockNumber";`
    );
    return Number(fromBlockNumber.last_value);
  }

  public async setHoldPointStatisticalBlockNumber(blockNumber: number): Promise<void> {
    const transactionManager = this.unitOfWork.getTransactionManager();
    await transactionManager.query(`SELECT setval('"holdPointOfLpStatisticalBlockNumber"', $1, false);`, [blockNumber]);
  }
}