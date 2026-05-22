import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-auth-layout',
  standalone: true,
  imports: [RouterOutlet],
  template: `
    <div class="auth-viewport">
      <div class="glow-orb glow-1"></div>
      <div class="glow-orb glow-2"></div>
      
      <div class="auth-inner">
        <div class="brand-section">
          <span class="material-icons-round brand-icon">token</span>
          <h2>TEAM TASK MANAGER</h2>
          <p>Orchestrate project workflows with precision</p>
        </div>
        
        <router-outlet></router-outlet>
      </div>
    </div>
  `,
  styles: [`
    .auth-viewport {
      min-height: 100vh;
      width: 100vw;
      background-color: var(--bg-obsidian-deep);
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
      overflow: hidden;
      padding: 24px;
    }

    // Glowing Crimson Background Orbs for Premium SaaS Feel
    .glow-orb {
      position: absolute;
      border-radius: 50%;
      filter: blur(120px);
      z-index: 1;
      opacity: 0.15;
      pointer-events: none;

      &.glow-1 {
        top: -10%;
        left: -10%;
        width: 50vw;
        height: 50vw;
        background: radial-gradient(circle, var(--color-primary) 0%, transparent 70%);
      }

      &.glow-2 {
        bottom: -10%;
        right: -10%;
        width: 50vw;
        height: 50vw;
        background: radial-gradient(circle, var(--color-accent) 0%, transparent 70%);
      }
    }

    .auth-inner {
      width: 100%;
      max-width: 450px;
      z-index: 2;
    }

    .brand-section {
      text-align: center;
      margin-bottom: 32px;

      .brand-icon {
        font-size: 48px;
        color: var(--color-primary);
        text-shadow: var(--shadow-glow);
        margin-bottom: 12px;
      }

      h2 {
        font-size: 1.8rem;
        font-weight: 800;
        letter-spacing: 0.05em;
        background: linear-gradient(135deg, #FFFFFF 0%, #B3B3B3 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        margin-bottom: 6px;
      }

      p {
        font-size: 0.85rem;
        color: var(--color-text-secondary);
        font-weight: 500;
      }
    }
  `]
})
export class AuthLayoutComponent {}
