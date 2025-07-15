import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgxChartsModule, Color, ScaleType } from '@swimlane/ngx-charts';
import { MoodService, MoodStatistics, MoodRecord } from '../services/mood.service';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-analytics',
  standalone: true,
  imports: [CommonModule, NgxChartsModule],
  templateUrl: './analytics.component.html',
  styleUrls: ['./analytics.component.css']
})
export class AnalyticsComponent implements OnInit {
  moodBalanceChartData: any[] = [];
  recordLevelDominantMoodsData: any[] = [];
  detailedEmotionTrendsData: any[] = []; // New: For detailed emotion trends line chart
  view: [number, number] = [700, 300]; // Chart dimensions

  // Chart options for Mood Balance (Sentiment Score)
  showLegend: boolean = true;
  showXAxis: boolean = true;
  showYAxis: boolean = true;
  gradient: boolean = false;
  showXAxisLabel: boolean = true;
  xAxisLabel: string = 'Date';
  showYAxisLabel: boolean = true;
  yAxisLabel: string = 'Sentiment Score (0-100)';
  autoScale: boolean = false;
  yScaleMin: number = 0;
  yScaleMax: number = 100;

  // Options for Record-Level Dominant Moods Bar Chart
  showBarXAxis: boolean = true;
  showBarYAxis: boolean = true;
  showBarXAxisLabel: boolean = true;
  barXAxisLabel: string = 'Emotion';
  showBarYAxisLabel: boolean = true;
  barYAxisLabel: string = 'Number of Records (Dominant)';
  showBarLegend: boolean = false;

  // New: Options for Detailed Emotion Trends Line Chart
  showDetailedTrendsXAxis: boolean = true;
  showDetailedTrendsYAxis: boolean = true;
  showDetailedTrendsXAxisLabel: boolean = true;
  detailedTrendsXAxisLabel: string = 'Date';
  showDetailedTrendsYAxisLabel: boolean = true;
  detailedTrendsYAxisLabel: string = 'Emotion Intensity (0-100)';
  showDetailedTrendsLegend: boolean = true;
  detailedTrendsAutoScale: boolean = false; // Keep Y axis 0-100
  detailedTrendsYScaleMin: number = 0;
  detailedTrendsYScaleMax: number = 100;

  public Math = Math; // Expose Math to the template

  moodBalanceColorScheme: Color = {
    name: 'moodBalanceScheme',
    selectable: true,
    group: ScaleType.Ordinal,
    domain: [
      this.getEmotionColorData('mood_balance').borderColor
    ]
  };

  // New: Color scheme for record-level dominant moods bar chart
  recordLevelDominantMoodsColorScheme: Color = {
    name: 'recordLevelDominantMoodsScheme',
    selectable: true,
    group: ScaleType.Ordinal,
    domain: [
      this.getEmotionColorData('happy').borderColor,
      this.getEmotionColorData('sad').borderColor,
      this.getEmotionColorData('angry').borderColor,
      this.getEmotionColorData('relaxed').borderColor
    ]
  };

  // New: Color scheme for detailed emotion trends
  detailedEmotionTrendsColorScheme: Color = {
    name: 'detailedEmotionTrendsScheme',
    selectable: true,
    group: ScaleType.Ordinal,
    domain: [
      this.getEmotionColorData('happy').borderColor,    // Happy
      this.getEmotionColorData('sad').borderColor,      // Sad
      this.getEmotionColorData('angry').borderColor,    // Angry
      this.getEmotionColorData('relaxed').borderColor  // Relaxed
    ]
  };

  // New: Getter for Y-axis max of the record-level dominant moods bar chart
  get recordLevelDominantMoodsBarYScaleMax(): number {
    if (this.recordLevelDominantMoodsData && this.recordLevelDominantMoodsData.length > 0) {
      const maxVal = Math.max(...this.recordLevelDominantMoodsData.map(d => d.value));
      return maxVal > 0 ? maxVal + 1 : 1; // Ensure Y axis shows at least 1
    }
    return 1; // Default if no data
  }

  // New: Getter to enable/disable the record-level dominant moods bar chart
  get recordLevelDominantMoodsBarEnabled(): boolean {
    return this.recordLevelDominantMoodsData && this.recordLevelDominantMoodsData.length > 0 && this.recordLevelDominantMoodsData.some(d => d.value > 0);
  }

  // New: Getter to enable/disable the detailed emotion trends chart
  get detailedEmotionTrendsEnabled(): boolean {
    return this.detailedEmotionTrendsData && this.detailedEmotionTrendsData.length > 0 && this.detailedEmotionTrendsData.some(series => series.series.length > 0);
  }

  error: string | null = null;
  isLoading: boolean = true;

  constructor(
    private moodService: MoodService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.fetchMoodStatistics();
  }

  fetchMoodStatistics(): void {
    this.isLoading = true;
    this.error = null;
    this.moodService.getMoodStatistics().subscribe({
      next: (stats: MoodStatistics) => {
        this.isLoading = false;
        if (stats && stats.records && stats.records.length > 0) {
          this.transformDataForChart(stats.records);
          if (!this.detailedEmotionTrendsEnabled && !this.recordLevelDominantMoodsBarEnabled && (this.moodBalanceChartData.length === 0 || (this.moodBalanceChartData[0] && this.moodBalanceChartData[0].series.length === 0))) {
            this.error = 'No processable mood data available for the last week.';
          }
        } else {
          this.moodBalanceChartData = [];
          this.recordLevelDominantMoodsData = [];
          this.detailedEmotionTrendsData = []; // Clear detailed trends data too
          this.error = 'No mood data available for the last week.';
        }
      },
      error: (err) => {
        this.isLoading = false;
        console.error('Error fetching mood statistics:', err);
        this.error = 'Could not load mood statistics.';
        if (err.status === 401) {
          this.authService.logout(); // Consider redirecting to login
        }
      }
    });
  }

  transformDataForChart(records: MoodRecord[]): void {
    console.log('Transforming data for all charts:', records);

    if (!records || records.length === 0) {
      this.moodBalanceChartData = [];
      this.recordLevelDominantMoodsData = [];
      this.detailedEmotionTrendsData = []; // Clear detailed trends data
      return;
    }

    const sortedRecords = records.sort((a, b) => {
      const dateA = a.recorded_at ? new Date(a.recorded_at).getTime() : 0;
      const dateB = b.recorded_at ? new Date(b.recorded_at).getTime() : 0;
      return dateA - dateB;
    });

    const alreadyPresentData = new Set<number>();
    const filteredRecords = sortedRecords.filter(record => {
      if (record.recorded_at) {
        const date = new Date(record.recorded_at).getTime()
        const dateKey = Math.floor(date / (1000 * 60));
        if (alreadyPresentData.has(dateKey)) {
          return false; // Skip if this date is already processed
        }
        alreadyPresentData.add(dateKey);
      }
      return true; // Include this record
    });

    const seriesSentimentScore = { name: 'Sentiment Score', series: [] as { name: string, value: number }[] };
    const recordLevelCounts = { happy: 0, sad: 0, angry: 0, relaxed: 0 };

    const seriesHappy = { name: 'Happy', series: [] as { name: string, value: number }[] };
    const seriesSad = { name: 'Sad', series: [] as { name: string, value: number }[] };
    const seriesAngry = { name: 'Angry', series: [] as { name: string, value: number }[] };
    const seriesRelaxed = { name: 'Relaxed', series: [] as { name: string, value: number }[] };

    let allSameDay = true;
    if (filteredRecords.length > 0 && filteredRecords[0].recorded_at) {
      const firstDayString = new Date(filteredRecords[0].recorded_at).toDateString();
      for (let i = 1; i < filteredRecords.length; i++) {
        if (!filteredRecords[i].recorded_at || new Date(filteredRecords[i].recorded_at!).toDateString() !== firstDayString) {
          allSameDay = false;
          break;
        }
      }
    } else if (filteredRecords.length > 0) {
      allSameDay = filteredRecords.every(r => !r.recorded_at);
    }

    filteredRecords.forEach(record => {
      let dateLabel: string;
      if (record.recorded_at) {
        const recordDate = new Date(record.recorded_at);
        if (allSameDay) {
          dateLabel = recordDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        } else {
          dateLabel = recordDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
        }
      } else {
        dateLabel = 'Unknown Date';
      }

      const happyValue = record.happy * 100;
      const sadValue = record.sad * 100;

      const goodMoodValue = (happyValue + relaxedValue) / 2;
      const badMoodValue = (sadValue + angryValue) / 2;
      const moodBalanceValue = goodMoodValue - badMoodValue;
      const sentimentScore = (moodBalanceValue + 100) / 2;
      seriesSentimentScore.series.push({ name: dateLabel, value: sentimentScore });

      // Populate detailed emotion trends series
      seriesHappy.series.push({ name: dateLabel, value: happyValue });
      seriesSad.series.push({ name: dateLabel, value: sadValue });
      seriesAngry.series.push({ name: dateLabel, value: angryValue });
      seriesRelaxed.series.push({ name: dateLabel, value: relaxedValue });

      // Determine dominant emotion for the current record (for bar chart)
      const emotionsInRecord = [
        { name: 'happy', value: record.happy },
        { name: 'sad', value: record.sad },
        { name: 'angry', value: record.angry },
        { name: 'relaxed', value: record.relaxed }
      ];
      emotionsInRecord.sort((a, b) => b.value - a.value); // Sort descending by score

      if (emotionsInRecord.length > 0 && emotionsInRecord[0].value > 0) {
        const maxScore = emotionsInRecord[0].value;
        emotionsInRecord.filter(emotion => emotion.value === maxScore).forEach(dominantEmotion => {
          (recordLevelCounts as any)[dominantEmotion.name]++;
        });
      }
    });

    if (seriesSentimentScore.series.length > 0) {
      this.moodBalanceChartData = [seriesSentimentScore];
    } else {
      this.moodBalanceChartData = [];
    }

    this.recordLevelDominantMoodsData = [
      { name: 'Happy', value: recordLevelCounts.happy },
      { name: 'Sad', value: recordLevelCounts.sad },
      { name: 'Angry', value: recordLevelCounts.angry },
      { name: 'Relaxed', value: recordLevelCounts.relaxed }
    ];

    // New: Populate detailed emotion trends data for the chart
    this.detailedEmotionTrendsData = [];
    if (seriesHappy.series.length > 0) this.detailedEmotionTrendsData.push(seriesHappy);
    if (seriesSad.series.length > 0) this.detailedEmotionTrendsData.push(seriesSad);
    if (seriesAngry.series.length > 0) this.detailedEmotionTrendsData.push(seriesAngry);
    if (seriesRelaxed.series.length > 0) this.detailedEmotionTrendsData.push(seriesRelaxed);
  }

  getEmotionColorData(emotion: 'mood_balance' | 'happy' | 'sad' | 'angry' | 'relaxed'): { borderColor: string, backgroundColor: string } {
    const alpha = 1; // Opacity for colors
    switch (emotion) {
      case 'mood_balance': return { borderColor: `rgba(138, 43, 226, ${alpha})`, backgroundColor: `rgba(138, 43, 226, 0.5)` }; // BlueViolet
      case 'happy': return { borderColor: `rgba(255, 206, 86, ${alpha})`, backgroundColor: `rgba(255, 206, 86, 0.5)` }; // Yellow
      case 'sad': return { borderColor: `rgba(54, 162, 235, ${alpha})`, backgroundColor: `rgba(54, 162, 235, 0.5)` };    // Blue
      case 'angry': return { borderColor: `rgba(255, 99, 132, ${alpha})`, backgroundColor: `rgba(255, 99, 132, 0.5)` };   // Red
      case 'relaxed': return { borderColor: `rgba(75, 192, 192, ${alpha})`, backgroundColor: `rgba(75, 192, 192, 0.5)` }; // Green/Teal
      default: return { borderColor: `rgba(201, 203, 207, ${alpha})`, backgroundColor: `rgba(201, 203, 207, 0.5)` };      // Grey
    }
  }

  onSelect(event: any): void {
    console.log('Chart item selected:', event);
  }
}
