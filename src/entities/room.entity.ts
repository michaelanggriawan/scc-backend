import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { EntityStatus } from '../common/enums';

export interface RoomSpec {
  system: string;
  spec: string;
}

@Entity('rooms')
export class Room {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ default: '' })
  name: string;

  @Column({ default: '' })
  capacity: string;

  @Column({ default: '' })
  area: string;

  @Column({ type: 'varchar', default: EntityStatus.Active })
  status: EntityStatus;

  @Column({ type: 'text', default: '' })
  description: string;

  // string[] — stored as JSON text so it works on both Postgres and sqlite
  @Column({ type: 'simple-json', nullable: true })
  facilities: string[];

  // RoomSpec[] — { system, spec }
  @Column({ type: 'simple-json', nullable: true })
  specs: RoomSpec[];

  // Optional media (URLs of uploaded photos / floor plans / spec PDF)
  @Column({ type: 'simple-json', nullable: true })
  photos: string[];

  @Column({ type: 'simple-json', nullable: true })
  floorPlans: string[];

  @Column({ type: 'varchar', nullable: true })
  specPdfUrl: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
