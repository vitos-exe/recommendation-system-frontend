import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subscription, interval, switchMap, catchError, of, tap, forkJoin } from 'rxjs';

import { AuthService } from '../services/auth.service';
import { SpotifyService, Track, SpotifyAuthResponse } from '../services/spotify.service';
import { MoodService, MoodVector, RecommendedSong } from '../services/mood.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent implements OnInit, OnDestroy {
  isSpotifyAuthenticated: boolean = false;

  currentMood: string = 'Loading mood...';
  actualMoodVector: MoodVector | null = null;
  recentTracks: Track[] = [];
  recommendedTrack: RecommendedSong | null = null;
  error: string | null = null;
  recommendationMessage: string | null = null;

  private dataPollingSubscription?: Subscription;

  constructor(
    private authService: AuthService,
    private spotifyService: SpotifyService,
    private moodService: MoodService,
  ) {}

  ngOnInit(): void {
    this.loadInitialData(false);
  }

  ngOnDestroy(): void {
    this.dataPollingSubscription?.unsubscribe();
  }

  private initializeDataPolling(): void {
    if (this.dataPollingSubscription) {
      this.dataPollingSubscription.unsubscribe();
    }

    this.dataPollingSubscription = interval(30000)
      .pipe(
        switchMap(() => {
          if (!this.isSpotifyAuthenticated) return of(null);
          return forkJoin({
            tracks: this.spotifyService.getRecentTracks(10, 60, true).pipe(
              catchError(err => {
                console.warn('Polling: Could not fetch recent tracks', err);
                this.handleApiError(err, 'polling_recent_tracks');
                return of([] as Track[]);
              })
            ),
            mood: this.moodService.getCurrentMood().pipe(
              catchError(err => {
                console.warn('Polling: Could not fetch current mood', err);
                this.handleApiError(err, 'polling_mood');
                return of(null);
              })
            )
          });
        })
      )
      .subscribe({
        next: (response: { tracks: Track[] | null, mood: MoodVector | null } | null) => {
          if (response) {
            if (response.tracks && response.tracks.length > 0) {
              this.recentTracks = response.tracks;
            }
            this.updateCurrentMoodDisplay(response.mood);
          }
        },
        error: (err: any) => {
          console.error('Data polling subscription error', err);
          this.error = 'Could not update data periodically.';
        }
      });
  }

  private loadInitialData(isAfterAuthSuccess: boolean): void {
    this.spotifyService.getRecentTracks(10, 60, true).pipe(
      switchMap((tracks: Track[]) => {
        this.isSpotifyAuthenticated = true;
        this.recentTracks = tracks;
        this.error = null;
        return this.moodService.getCurrentMood().pipe(
          catchError(moodErr => {
            this.handleApiError(moodErr, 'initial_load_current_mood');
            return of(null);
          })
        );
      }),
      catchError(err => {
        this.isSpotifyAuthenticated = false;
        this.recentTracks = [];
        this.updateCurrentMoodDisplay(null);
        this.recommendedTrack = null;
        if (isAfterAuthSuccess) {
          this.error = 'Failed to load data from Spotify even after successful authentication. Please try refreshing.';
          console.error('Critical: Error fetching recent tracks after auth redirect:', err);
        } else {
          if (err.status !== 401 && err.status !== 403) {
            this.handleApiError(err, 'initial_spotify_check_tracks');
          } else {
            this.currentMood = 'Connect to Spotify to see your mood.';
          }
        }
        return of(null);
      })
    ).subscribe({
      next: (moodVector: MoodVector | null) => {
        this.updateCurrentMoodDisplay(moodVector);
        if (this.isSpotifyAuthenticated) {
          this.initializeDataPolling();
        }
      }
    });
  }

  fetchCurrentMood(): void {
    if (!this.isSpotifyAuthenticated) {
      this.updateCurrentMoodDisplay(null);
      return;
    }
    this.moodService.getCurrentMood().subscribe({
      next: (moodVector: MoodVector) => {
        this.updateCurrentMoodDisplay(moodVector);
        this.error = null;
      },
      error: (err: any) => {
        console.error('Error fetching current mood:', err);
        this.updateCurrentMoodDisplay(null);
        this.handleApiError(err, 'mood');
      }
    });
  }

  updateCurrentMoodDisplay(moodVector: MoodVector | null): void {
    this.actualMoodVector = moodVector;

    if (!this.isSpotifyAuthenticated && !moodVector) {
      this.currentMood = 'Connect to Spotify to see your mood.';
      return;
    }
    if (!moodVector || Object.keys(moodVector).length === 0) {
      this.currentMood = 'Mood data not available.';
      return;
    }

    let dominantEmotion = 'Neutral';
    let maxScore = 0;

    (Object.keys(moodVector) as Array<keyof MoodVector>).forEach(emotionKey => {
      const score = moodVector[emotionKey];
      const emotionName = String(emotionKey);
      if (typeof score === 'number' && score > maxScore) {
        maxScore = score;
        dominantEmotion = emotionName.charAt(0).toUpperCase() + emotionName.slice(1);
      }
    });

    if (maxScore > 0) {
      this.currentMood = dominantEmotion;
    } else {
      this.currentMood = 'Mood data unclear';
    }
  }

  connectSpotify(): void {
    this.spotifyService.getSpotifyAuthUrl().subscribe({
      next: (response: SpotifyAuthResponse) => {
        window.location.href = response.auth_url;
      },
      error: (err: any) => {
        console.error('Error getting Spotify auth URL:', err);
        this.error = 'Could not connect to Spotify. Please try again later.';
        this.handleApiError(err, 'spotify_auth_url');
      }
    });
  }

  getRecommendations(): void {
    this.recommendedTrack = null;
    this.error = null;
    this.recommendationMessage = null;

    let recommendationParams: any = { limit: 1 };

    if (this.actualMoodVector && Object.keys(this.actualMoodVector).length > 0) {
      recommendationParams = {
        ...recommendationParams,
        use_current_mood: false,
        happy: this.actualMoodVector.happy,
        sad: this.actualMoodVector.sad,
        angry: this.actualMoodVector.angry,
        relaxed: this.actualMoodVector.relaxed
      };
    } else {
      recommendationParams.use_current_mood = true;
    }

    this.moodService.getRecommendations(recommendationParams).subscribe({
      next: (recommendations: RecommendedSong[]) => {
        if (recommendations && recommendations.length > 0) {
          this.recommendedTrack = recommendations[0];
        } else {
          this.recommendationMessage = 'No recommendations available at the moment.';
        }
      },
      error: (err: any) => {
        console.error('Error fetching recommendations:', err);
        this.recommendedTrack = null;
        this.recommendationMessage = 'Failed to get recommendations.';
        this.handleApiError(err, 'recommendations');
      }
    });
  }

  queueSong(): void {
    if (!this.recommendedTrack) return;

    this.spotifyService.queueSong(this.recommendedTrack).subscribe({
      next: () => {
        this.recommendedTrack = null;
        this.recommendationMessage = 'Song queued! Want another recommendation?';
        this.error = null;
      },
      error: (err: any) => {
        console.error('Error queueing song:', err);
        this.recommendationMessage = null;
        if (err.status === 400 && err.error?.detail?.includes('Spotify active device not found')) {
          this.error = 'Could not queue song: No active Spotify device found. Please start playback on a Spotify device.';
        } else {
          this.handleApiError(err, 'queue_song');
        }
      }
    });
  }

  private handleApiError(err: any, context: string): void {
    console.error(`API Error (${context}):`, err);
    if (err.status === 401) {
      this.error = `Authentication error (${context}). Your session may have expired. Please log in again.`;
      this.isSpotifyAuthenticated = false;
      this.recentTracks = [];
      this.updateCurrentMoodDisplay(null);
      this.recommendedTrack = null;
      if (this.dataPollingSubscription) {
        this.dataPollingSubscription.unsubscribe();
      }
      this.authService.logout();
    } else if (err.status === 403) {
      this.isSpotifyAuthenticated = false;
      this.error = `Spotify access denied or token expired (${context}). Please reconnect Spotify.`;
      this.recentTracks = [];
      this.updateCurrentMoodDisplay(null);
      this.recommendedTrack = null;
      if (this.dataPollingSubscription) {
        this.dataPollingSubscription.unsubscribe();
      }
    } else if (err.error && err.error.detail) {
      this.error = `Error (${context}): ${err.error.detail}`;
    } else {
      this.error = `An unexpected error occurred (${context}). Please try again.`;
    }
  }
}
