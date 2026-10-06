use std::collections::BTreeMap;

use super::Stamped;
use crate::sets::Tombstone;

pub struct Side<'a, T> {
    pub items: &'a [T],
    pub deleted: &'a [Tombstone],
}

pub struct Merged<T> {
    pub items: Vec<T>,
    pub deleted: Vec<Tombstone>,
}

pub struct MergeInput<'a, T> {
    pub local: Side<'a, T>,
    pub remote: Side<'a, T>,
    pub max_items: usize,
    pub max_tombstones: usize,
}

pub fn merge_items<T: Stamped + Clone>(input: MergeInput<T>) -> Merged<T> {
    let MergeInput { local, remote, max_items, max_tombstones } = input;
    let mut deleted: BTreeMap<String, f64> = BTreeMap::new();

    for tombstone in local.deleted.iter().chain(remote.deleted) {
        let entry = deleted.entry(tombstone.id.clone()).or_insert(tombstone.deleted);

        *entry = entry.max(tombstone.deleted);
    }

    let mut items: BTreeMap<String, T> = BTreeMap::new();

    for item in local.items.iter().chain(remote.items) {
        if deleted.get(item.id()).is_some_and(|at| *at >= item.updated()) {
            continue;
        }

        match items.get(item.id()) {
            Some(known) if known.updated() >= item.updated() => {}
            _ => {
                items.insert(item.id().to_owned(), item.clone());
            }
        }
    }

    let mut merged: Vec<T> = items.into_values().collect();
    let mut tombstones: Vec<Tombstone> = deleted.into_iter().map(|(id, deleted)| Tombstone { id, deleted }).collect();

    merged.sort_by(|left, right| right.updated().total_cmp(&left.updated()).then_with(|| left.id().cmp(right.id())));
    merged.truncate(max_items);
    merged.sort_by(|left, right| left.created().total_cmp(&right.created()).then_with(|| left.id().cmp(right.id())));
    tombstones.sort_by(|left, right| left.deleted.total_cmp(&right.deleted));

    let excess = tombstones.len().saturating_sub(max_tombstones);

    tombstones.drain(..excess);

    Merged { items: merged, deleted: tombstones }
}
