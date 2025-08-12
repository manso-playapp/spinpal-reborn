'use client';

import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import type { DraggableSyntheticListeners } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';

interface SortableItemProps {
  id: string;
  children: (listeners: DraggableSyntheticListeners) => React.ReactNode;
}


export function SortableItem({ id, children }: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      {children(listeners)}
    </div>
  );
}
