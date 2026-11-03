import React, { useEffect, useRef } from 'react';
import * as joint from 'jointjs';
import { JSONConverter } from '../diagram/converter';
import { COMPARE_MARKS } from '../utils/constants';

/**
 * Schreibgeschützte Darstellung eines Diagramms mit optionalen Markierungen.
 * Nutzt einen eigenen JointJS-Graphen – der Editor bleibt unberührt.
 */
const DiagramPreview = ({ diagram, marks = {}, edgeMarks = {}, label }) => {
  const containerRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;

    const el = document.createElement('div');
    container.appendChild(el);
    const graph = new joint.dia.Graph({}, { cellNamespace: joint.shapes });
    const paper = new joint.dia.Paper({
      el,
      model: graph,
      width: container.clientWidth || 800,
      height: container.clientHeight || 500,
      interactive: false,
      background: { color: '#ffffff' },
      cellViewNamespace: joint.shapes
    });

    new JSONConverter(graph).fromJson(diagram || { nodes: [], edges: [] });

    Object.entries(marks).forEach(([id, mark]) => {
      const cell = graph.getCell(id);
      const style = COMPARE_MARKS[mark];
      if (!cell || !style) return;
      cell.attr('body/stroke', style.color);
      cell.attr('body/strokeWidth', style.width);
      if (style.dash) cell.attr('body/strokeDasharray', style.dash);
      if (style.opacity) cell.attr('root/opacity', style.opacity);
    });

    Object.entries(edgeMarks).forEach(([id, mark]) => {
      const cell = graph.getCell(id);
      const style = COMPARE_MARKS[mark];
      if (!cell || !style) return;
      cell.attr('line/stroke', style.color);
      cell.attr('line/strokeWidth', style.width - 1);
      cell.attr('line/targetMarker/fill', style.color);
      if (style.dash) cell.attr('line/strokeDasharray', style.dash);
      if (style.opacity) cell.attr('root/opacity', style.opacity);
    });

    paper.transformToFitContent({ padding: 30, maxScale: 1, horizontalAlign: 'middle', verticalAlign: 'middle' });

    return () => {
      paper.remove();
    };
  }, [diagram, marks, edgeMarks]);

  return <div ref={containerRef} className="w-full h-full overflow-hidden" role="img" aria-label={label} />;
};

export default DiagramPreview;
