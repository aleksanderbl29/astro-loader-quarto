/**
 * File watching utilities for hot module replacement
 */

import { watch as fsWatch, type FSWatcher } from "fs";
import { EventEmitter } from "events";

/**
 * File change event
 */
export interface FileChangeEvent {
  path: string;
  type: "add" | "change" | "unlink";
}

/**
 * File watcher for Quarto content
 */
export class QuartoFileWatcher extends EventEmitter {
  private watchers: FSWatcher[] = [];
  private watching: boolean = false;

  /**
   * Start watching paths
   */
  watch(paths: string[]): void {
    if (this.watching) {
      return;
    }

    this.watching = true;

    for (const path of paths) {
      try {
        const watcher = fsWatch(
          path,
          { recursive: true },
          (eventType, filename) => {
            if (!filename) return;

            const changeType = eventType === "rename" ? "add" : "change";

            this.emit("change", {
              path: filename,
              type: changeType,
            } as FileChangeEvent);
          },
        );

        this.watchers.push(watcher);
      } catch (error) {
        // Path might not exist yet, ignore
      }
    }
  }

  /**
   * Stop watching all paths
   */
  stop(): void {
    for (const watcher of this.watchers) {
      watcher.close();
    }
    this.watchers = [];
    this.watching = false;
  }

  /**
   * Check if watching
   */
  isWatching(): boolean {
    return this.watching;
  }
}

/**
 * Create a file watcher for Quarto content
 */
export function createFileWatcher(): QuartoFileWatcher {
  return new QuartoFileWatcher();
}
