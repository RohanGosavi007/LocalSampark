import React, { useEffect, useState } from 'react';
import { View, Linking } from 'react-native';
import {
  SM, Card, Row, Button, Field, DataState, useSocietyData, titleCase,
} from '../../../../src/components/society/SocietyKit';

/**
 * Who lives where. Numbers appear only for residents who have chosen to show
 * them (show_phone); the server withholds the rest.
 */
export default function DirectoryTab() {
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setQuery(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);
  const dir = useSocietyData(`${SM}/directory${query ? `?search=${encodeURIComponent(query)}` : ''}`);

  return (
    <Card title="Resident directory">
      <Field placeholder="Search by name, flat or profession" value={search} onChangeText={setSearch}
        accessibilityLabel="Search directory" returnKeyType="search" />
      <DataState state={dir} empty={query ? 'No one matches' : 'Directory is empty'}>
        <View>
          {(dir.data || []).map((m, i) => (
            <Row key={m.id} first={i === 0} title={m.full_name || 'Resident'}
              meta={[`Flat ${m.flat_number || '—'} · ${titleCase(m.role)}`, m.profession]}
              right={m.phone_number
                ? <Button label="Call" tone="secondary" small accessibilityLabel={`Call ${m.full_name}`}
                    onPress={() => Linking.openURL(`tel:${m.phone_number}`)} />
                : null} />
          ))}
        </View>
      </DataState>
    </Card>
  );
}
