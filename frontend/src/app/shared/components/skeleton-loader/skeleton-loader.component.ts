import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-skeleton-loader',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div [class]="'skeleton-container ' + type" [style.height]="height" [style.width]="width">
      <div class="skeleton-shimmer"></div>
    </div>
  `,
  styles: [`
    .skeleton-container {
      position: relative;
      overflow: hidden;
      background-color: #1A1A1A;
      border-radius: 8px;
      width: 100%;
      height: 100%;
      border: 1px solid rgba(255, 51, 51, 0.05);

      &.card {
        border-radius: 16px;
        height: 150px;
      }

      &.text {
        height: 16px;
        border-radius: 4px;
        margin-bottom: 8px;
      }

      &.circle {
        border-radius: 50%;
        height: 48px;
        width: 48px;
      }

      &.title {
        height: 28px;
        border-radius: 4px;
        margin-bottom: 16px;
      }
    }

    .skeleton-shimmer {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: linear-gradient(
        90deg,
        rgba(26, 26, 26, 0) 0%,
        rgba(255, 51, 51, 0.05) 50%,
        rgba(26, 26, 26, 0) 100%
      );
      animation: shimmer 1.5s infinite;
    }

    @keyframes shimmer {
      0% {
        transform: translateX(-100%);
      }
      100% {
        transform: translateX(100%);
      }
    }
  `]
})
export class SkeletonLoaderComponent {
  @Input() type: 'card' | 'text' | 'circle' | 'title' = 'card';
  @Input() height = '100%';
  @Input() width = '100%';
}
