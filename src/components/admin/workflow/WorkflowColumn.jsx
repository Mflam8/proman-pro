import React from 'react';
import WorkflowCard from './WorkflowCard';

export default function WorkflowColumn({ stage, items, onOpen }) {
  return (
    <div className={`min-w-[300px] rounded-3xl border p-4 ${stage.columnClass}`}>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-proman-navy">{stage.label}</h3>
          <p className="text-xs text-gray-500">{items.length} servicio(s)</p>
        </div>
      </div>
      <div className="space-y-3">
        {items.map((item) => <WorkflowCard key={item.inquiry.id} {...item} onOpen={() => onOpen(item.inquiry)} />)}
        {items.length === 0 && <div className="rounded-2xl border border-dashed border-gray-300 bg-white/60 p-4 text-center text-xs text-gray-500">Sin casos en esta etapa</div>}
      </div>
    </div>
  );
}