import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { RecommendedSong } from './mood.service';

export interface Track {
  id: string;
  name: string;
  artist: string;
  album?: string;
  uri?: string;
  title?: string;
}

export interface SpotifyAuthResponse {
  auth_url: string;
}

export interface SpotifyCallbackResponse {
  message: string;
}

export interface QueueSongResponse {
  message: string;
}

@Injectable({
  providedIn: 'root'
})
export class SpotifyService {

  constructor(private apiService: ApiService) { }

  getSpotifyAuthUrl(): Observable<SpotifyAuthResponse> {
    return this.apiService.get('spotify/auth');
  }

  getRecentTracks(limit: number = 20, time_limit_minutes?: number, analyze_mood?: boolean): Observable<Track[]> {
    const queryParams = new URLSearchParams();
    queryParams.append('limit', limit.toString());
    if (time_limit_minutes !== undefined) {
      queryParams.append('time_limit_minutes', time_limit_minutes.toString());
    }
    if (analyze_mood !== undefined) {
      queryParams.append('analyze_mood', analyze_mood.toString());
    }
    const queryString = queryParams.toString();
    return this.apiService.get(`spotify/recent-tracks?${queryString}`);
  }

  queueSong(song: RecommendedSong): Observable<QueueSongResponse> {
    return this.apiService.post('spotify/queue-song', song);
  }
}
