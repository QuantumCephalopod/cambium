"""Schattenseiten owns the existing admitted work-list boundary."""
def validate(data, body, common):
    if data.get('organ') != 'schattenseiten' or not isinstance(data.get('works'), list):
        raise ValueError('Schattenseiten admitted work source changed')
    ids = [work.get('id') for work in data['works'] if isinstance(work, dict)]
    if len(ids) != len(data['works']) or len(set(ids)) != len(ids) or any(not isinstance(i, str) or not i for i in ids):
        raise ValueError('Schattenseiten work identity is missing or repeated')
    return data
