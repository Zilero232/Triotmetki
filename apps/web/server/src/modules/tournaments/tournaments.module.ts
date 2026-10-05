import { Module } from '@nestjs/common';

import { CommunityCoreModule } from '../community-core';
import { tournamentSeedsQueriesProvider } from './providers/tournament-seeds-queries.provider';
import { TournamentReaderService } from './services/tournament-reader.service';
import { TournamentWriterService } from './services/tournament-writer.service';
import { TournamentsController } from './tournaments.controller';

@Module({
  imports: [CommunityCoreModule],
  controllers: [TournamentsController],
  providers: [tournamentSeedsQueriesProvider, TournamentReaderService, TournamentWriterService]
})
export class TournamentsModule {}
