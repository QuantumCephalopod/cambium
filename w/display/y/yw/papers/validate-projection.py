"""Papers owns its already-admitted public feed projection boundary."""


def validate(data, site_dir, common):
    GENES = common['genes']
    if data.get('source') != 'papers/_feed':
        raise ValueError('Papers projection source boundary changed')
    if set(data.get('phenotype', {})) != set(GENES) or set(data.get('groups', {})) != set(GENES):
        raise ValueError('Papers projection must expose realized local root 4V')
    for gene in GENES:
        if not isinstance(data['phenotype'][gene], str) or not data['phenotype'][gene]:
            raise ValueError('Papers phenotype contains an empty locus')
        if not isinstance(data['groups'][gene], list):
            raise ValueError('Papers group is not a list')
        for item in data['groups'][gene]:
            if set(item) != {'id','title'}:
                raise ValueError('Papers projection crossed its public boundary')
    return data
