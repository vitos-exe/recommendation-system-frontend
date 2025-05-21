import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { Track } from './spotify.service'; // Import Track interface

export interface MoodVector {
  happy: number;
  sad: number;
  angry: number;
  relaxed: number;
  [key: string]: number;
}

export interface MoodRecord {
  id?: number;
  user_id?: number;
  happy: number;
  sad: number;
  angry: number;
  relaxed: number;
  notes?: string;
  recorded_at?: string;
}

export interface MoodStatistics {
  start_date: string;
  end_date: string;
  records: MoodRecord[];
}

export interface RecommendedSong {
  id: string;
  title: string;
  artist: string;
  album: string;
  uri: string;
  reason?: string;
}

@Injectable({
  providedIn: 'root'
})
export class MoodService {

  constructor(private apiService: ApiService) { }

  getCurrentMood(minutes: number = 60): Observable<MoodVector> {
    return this.apiService.get(`mood/current?minutes=${minutes}`);
  }

  getMoodStatistics(days: number = 7): Observable<MoodStatistics> {
    return this.apiService.get(`mood/statistics?days=${days}`);
  }

  getRecommendations(params: { limit?: number, use_current_mood?: boolean, happy?: number, sad?: number, angry?: number, relaxed?: number }): Observable<RecommendedSong[]> {
    let endpoint = 'recommendations';
    const queryParams = new URLSearchParams();

    if (params.limit !== undefined) {
      queryParams.append('limit', params.limit.toString());
    }
    if (params.use_current_mood !== undefined) {
      queryParams.append('use_current_mood', params.use_current_mood.toString());
    }

    if (params.use_current_mood === false) {
      if (params.happy !== undefined) queryParams.append('happy', params.happy.toString());
      if (params.sad !== undefined) queryParams.append('sad', params.sad.toString());
      if (params.angry !== undefined) queryParams.append('angry', params.angry.toString());
      if (params.relaxed !== undefined) queryParams.append('relaxed', params.relaxed.toString());
    }

    const queryString = queryParams.toString();
    if (queryString) {
      endpoint += `?${queryString}`;
    }

    return this.apiService.get(endpoint);
  }
}
